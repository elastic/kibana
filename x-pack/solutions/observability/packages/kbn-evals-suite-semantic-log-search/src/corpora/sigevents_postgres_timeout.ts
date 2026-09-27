/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalQuery } from '../ground_truth';
import type { CorpusProfile } from './types';

/**
 * Classes of message in the corpus, labelled by meaning rather than vocabulary.
 *
 * Labels are case-insensitive substrings of generated `message` fields, each traceable to a
 * literal template under the path below. The file named per class is where that class's labels
 * are defined, which is worth knowing because `noise.ts` templates fire on every cycle while the
 * rest are emitted by a failure phase. `ground_truth.test.ts` checks that no label is a substring
 * of another and that nothing is both relevant and a trap; `auditCorpus` checks at run time that
 * each one is present in the generated data.
 * src/platform/packages/shared/kbn-synthtrace/src/lib/service_graph_logs/
 */
export const MESSAGE_CLASSES = {
  /** Postgres pool exhaustion and connection rejection. Templates: `log_catalog/database.ts`. */
  postgresPoolFailure: [
    'remaining connection slots are reserved',
    'could not connect to the server: Connection refused',
    'Connection pool exhausted',
  ],

  /**
   * Generic HTTP and TCP connectivity failures, neither Postgres nor Kafka.
   * Templates: `log_catalog/outbound.ts`, `log_catalog/database.ts`, `log_catalog/request.ts`.
   */
  networkConnectivityFailure: [
    'outbound connection refused',
    'Error connecting to host',
    'upstream returned error',
  ],

  /**
   * Kafka and message-broker unreachability.
   *
   * Templates: `log_catalog/message_queue.ts` for the ISR label. The broker label is not a
   * catalog template at all; it is a service log on `payment-processor` in the default service
   * graph, which is why it appears even though the failure injected here is Postgres.
   * https://github.com/elastic/kibana/blob/0021bfbb5887/src/platform/packages/shared/kbn-synthtrace/src/lib/service_graph_logs/service_graph.ts#L87
   */
  kafkaBrokerFailure: ['unable to reach Kafka broker', 'No live ISR replicas for partition'],

  /**
   * Pool saturation warnings: degraded, but not yet failed.
   *
   * Templates: `log_catalog/database.ts` for three of the four, one per runtime. The
   * `pool nearing capacity` label comes from `log_catalog/noise.ts`, so unlike the other three it
   * is not tied to the injected failure and appears outside the failure window too.
   */
  connectionPoolWarning: [
    '"msg":"pool nearing capacity"',
    'connection pool at 90% capacity',
    '"msg":"pg pool approaching limit"',
    'msg="pgx: connection pool approaching limit"',
  ],

  /**
   * Healthy or informational messages sharing "connection" and "pool" vocabulary, used as traps
   * in the connectivity-failure queries.
   *
   * Templates: mostly `log_catalog/noise.ts`, plus `log_catalog/database.ts` and
   * `log_catalog/cache.ts`. Being predominantly noise is what makes them good traps: they are
   * present in volume whether or not anything is failing.
   */
  connectionHealthy: [
    'connection received: host=',
    'ConnectionPool stats:',
    '"msg":"pool stats"',
    'msg="connection pool snapshot"',
    'app.pool  Connection pool: active=',
    'Ready to accept connections tcp',
  ],

  /**
   * Database slowness and lock contention, which is not a connectivity failure.
   * Templates: `log_catalog/database.ts`.
   */
  databaseSlowness: [
    'still waiting for ShareLock on transaction',
    'duration: 8435 ms  statement',
    '"msg":"Slow query"',
  ],
} as const;

export const QUERIES: readonly EvalQuery[] = [
  // --- Semantic queries ---

  {
    id: 'connection_failures',
    kind: 'semantic',
    question: 'connection failures',
    graded: [
      {
        grade: 2,
        matches: [
          ...MESSAGE_CLASSES.postgresPoolFailure,
          ...MESSAGE_CLASSES.networkConnectivityFailure,
          ...MESSAGE_CLASSES.kafkaBrokerFailure,
        ],
      },
      { grade: 1, matches: MESSAGE_CLASSES.connectionPoolWarning },
    ],
    traps: MESSAGE_CLASSES.connectionHealthy,
    note: 'Four of the eight grade-2 labels never use the word "connection", so half the answers are unreachable by the query term alone. Grade-1 pool warnings share the vocabulary but are not failures.',
  },

  {
    id: 'cannot_reach_dependency',
    kind: 'semantic',
    question: 'a service cannot reach one of its dependencies',
    graded: [
      {
        grade: 2,
        matches: [
          ...MESSAGE_CLASSES.postgresPoolFailure,
          ...MESSAGE_CLASSES.networkConnectivityFailure,
          ...MESSAGE_CLASSES.kafkaBrokerFailure,
        ],
      },
      { grade: 1, matches: MESSAGE_CLASSES.connectionPoolWarning },
    ],
    traps: MESSAGE_CLASSES.connectionHealthy,
    note: 'Paraphrase of connection_failures with no vocabulary overlap with the log lines. Tests vocabulary-independent ranking.',
  },

  {
    id: 'database_slow',
    kind: 'semantic',
    question: 'the database is responding slowly',
    graded: [
      { grade: 2, matches: MESSAGE_CLASSES.databaseSlowness },
      { grade: 1, matches: MESSAGE_CLASSES.connectionPoolWarning },
    ],
    traps: [
      ...MESSAGE_CLASSES.postgresPoolFailure,
      ...MESSAGE_CLASSES.networkConnectivityFailure,
      ...MESSAGE_CLASSES.kafkaBrokerFailure,
    ],
    note: 'Must separate slowness from connectivity failure. Connectivity failures are the traps here.',
  },

  {
    id: 'connection_pool_pressure',
    kind: 'semantic',
    question: 'connection pool approaching capacity',
    graded: [
      { grade: 2, matches: MESSAGE_CLASSES.connectionPoolWarning },
      { grade: 1, matches: MESSAGE_CLASSES.postgresPoolFailure },
    ],
    traps: MESSAGE_CLASSES.connectionHealthy,
    note: 'Pool saturation warnings are grade 2 (the right answer); pool exhaustion is grade 1, because it has already exceeded capacity rather than approaching it. Healthy pool stats are the trap.',
  },

  {
    id: 'postgres_connection_refused',
    kind: 'semantic',
    question: 'postgres refusing connections or out of connection slots',
    graded: [
      { grade: 2, matches: MESSAGE_CLASSES.postgresPoolFailure },
      { grade: 1, matches: MESSAGE_CLASSES.connectionPoolWarning },
    ],
    traps: [...MESSAGE_CLASSES.kafkaBrokerFailure, ...MESSAGE_CLASSES.networkConnectivityFailure],
    note: 'Kafka and generic network failures are traps: genuine connectivity failures, but not Postgres ones. Tests whether the ranker separates DB-pool errors from other connectivity failures.',
  },

  {
    id: 'kafka_broker_unavailable',
    kind: 'semantic',
    question: 'messages failing to reach the message broker',
    graded: [{ grade: 2, matches: MESSAGE_CLASSES.kafkaBrokerFailure }],
    traps: [...MESSAGE_CLASSES.postgresPoolFailure, ...MESSAGE_CLASSES.connectionHealthy],
    note: 'Tests whether the ranker separates Kafka messaging failures from Postgres pool failures. Postgres failures and healthy connection logs are traps.',
  },

  // --- Literal non-regression queries ---

  {
    id: 'literal_econnrefused',
    kind: 'literal',
    question: 'ECONNREFUSED',
    graded: [{ grade: 2, matches: ['outbound connection refused'] }],
    traps: [],
    note: 'Literal token search must not regress.',
  },

  {
    id: 'literal_hikari',
    kind: 'literal',
    question: 'HikariPool',
    graded: [
      { grade: 2, matches: ['Connection pool exhausted', 'connection pool at 90% capacity'] },
    ],
    traps: [],
    note: 'Both lines carry the literal class name, so both are correct answers.',
  },
];

/**
 * Corpus generated by the synthtrace `sigevents` scenario `postgres_timeout`.
 *
 * The scenario fails Postgres with `db_timeout` at an 80% rate for the first 5 minutes of each
 * 10-minute cycle. The failure cascades to every upstream caller, which is what produces
 * connectivity, pool and slowness messages across four runtimes and their different log formats.
 * The labels survive regeneration only while the scenario and seed stay pinned, so both are part
 * of `setupCommand` rather than left to the caller.
 * https://github.com/elastic/kibana/blob/0021bfbb5887/src/platform/packages/shared/kbn-synthtrace/src/scenarios/sigevents/mock_apps/claims.ts#L26
 */
export const sigeventsPostgresTimeout: CorpusProfile = {
  id: 'sigevents_postgres_timeout',
  description:
    'Connectivity and slowness messages from the synthtrace sigevents scenario (postgres_timeout, seed=42)',

  target: 'logs-synth-default',
  timeRange: { start: 'now-2h', end: 'now' },

  setupCommand: `node scripts/synthtrace sigevents \\
  --target=http://elastic:changeme@localhost:9220 \\
  --kibana=http://elastic:changeme@localhost:5620 \\
  --scenarioOpts="scenario=postgres_timeout,seed=42" \\
  --from=now-2h --to=now --clean`,

  messageClasses: MESSAGE_CLASSES,
  queries: QUERIES,

  k: 10,
  relevanceThreshold: 2,
  maxPatterns: 20,
};
