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
 * Labels are case-insensitive substrings of generated `message` fields. Every label
 * is traceable to a literal template in `kbn-synthtrace/src/lib/service_graph_logs/log_catalog/`.
 * The invariant tests in `ground_truth.test.ts` verify that no label is a substring of
 * another and that nothing is simultaneously relevant and a trap.
 */
const MESSAGE_CLASSES = {
  /**
   * Postgres pool exhaustion and connection rejection.
   *
   * Templates: `log_catalog/database.ts` (postgres infra + app db_timeout).
   */
  postgresPoolFailure: [
    'remaining connection slots are reserved',
    'could not connect to the server: Connection refused',
    'Connection pool exhausted',
  ],

  /**
   * Generic HTTP/TCP connectivity failures (non-Postgres, non-Kafka).
   *
   * Templates: `log_catalog/outbound.ts` (http error.unavailable + bad_gateway node error),
   * `log_catalog/database.ts` (mongodb/elasticsearch error).
   */
  networkConnectivityFailure: [
    'outbound connection refused',
    'Error connecting to host',
    'upstream returned error',
  ],

  /**
   * Kafka / message-broker unreachability.
   *
   * Templates: `log_catalog/message_queue.ts` (kafka error.unavailable) and
   * `log_catalog/outbound.ts` (kafka error.unavailable go/node).
   */
  kafkaBrokerFailure: ['unable to reach Kafka broker', 'No live ISR replicas for partition'],

  /**
   * Pool saturation warnings — degraded but not yet failed.
   *
   * Templates: `log_catalog/database.ts` (postgres app db_timeout warn,
   * all four runtimes: go/java/node/python).
   */
  connectionPoolWarning: [
    '"msg":"pool nearing capacity"',
    'connection pool at 90% capacity',
    '"msg":"pg pool approaching limit"',
    'msg="pgx: connection pool approaching limit"',
  ],

  /**
   * Healthy or informational messages that share "connection" / "pool" vocabulary.
   * Used as traps in connectivity-failure queries.
   *
   * Templates: `log_catalog/database.ts` (postgres infra healthy),
   * `log_catalog/cache.ts` (redis infra healthy).
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
   * Database slowness and lock contention (not a connectivity failure).
   *
   * Templates: `log_catalog/database.ts` (postgres infra db_timeout warn, mongodb infra warn).
   */
  databaseSlowness: [
    'still waiting for ShareLock on transaction',
    'duration: 8435 ms  statement',
    '"msg":"Slow query"',
  ],
} as const;

const QUERIES: readonly EvalQuery[] = [
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
    note: 'Six of the eight grade-2 labels never use the word "connection". Grade-1 pool warnings share vocabulary but are not failures.',
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
    note: 'Pool saturation warnings are grade 2 (the right answer); pool exhaustion is grade 1 (too late — exceeded, not approaching). Healthy pool stats are the trap.',
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
    note: 'Kafka and generic network failures are traps — they are connectivity failures but not Postgres-specific. Tests whether the ranker separates DB-pool errors from other connectivity failures.',
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
 * The scenario introduces a Postgres `db_timeout` failure at 80% rate for the first
 * 5 minutes of each 10-minute cycle, which cascades to all upstream callers and
 * generates connectivity + pool + slowness messages in mixed log formats (go/java/node/python).
 *
 * Ground truth labels survive regeneration as long as the scenario and seed stay
 * pinned. `auditCorpus` verifies that every label is actually present before any run.
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
