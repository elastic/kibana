/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * APM services with transactions, purpose-built to manually test SLOs that are
 * "grouped by service.name" (an APM SLO created with `service: '*'` and
 * `groupBy: ['service.name']`, which produces one SLO *instance* per service,
 * stored under `slo.groupings.service.name`).
 *
 * This lets you verify the change that makes the APM "Service SLOs" tab and the
 * SLO grouped-stats endpoint match instances by `slo.groupings.service.name` (in
 * addition to the plain `service.name`), and that the "Manage SLOs" deep-link
 * filter matches both fields.
 *
 * Related:
 * - APM `get_service_slos` + SLO `get_slo_grouped_stats` grouped-by-service.name support.
 *
 * Data shape (4 services, all in one environment so a single `service: '*'`
 * grouped-by-service.name SLO produces 4 instances with mixed statuses):
 * - `synth-grouped-checkout`  : fast (~150ms), 0% errors  -> HEALTHY for both duration & error-rate SLOs
 * - `synth-grouped-catalog`   : fast (~200ms), 0% errors  -> HEALTHY
 * - `synth-grouped-payments`  : slow (~900ms), 0% errors  -> VIOLATES a latency SLO (threshold < 900ms)
 * - `synth-grouped-cart`      : fast (~180ms), ~40% errors -> VIOLATES an error-rate SLO
 *
 * Run:
 *   node scripts/synthtrace apm_grouped_slos --from now-1w --to now
 *
 * Manual live run (optional, stop with Ctrl+C):
 *   node scripts/synthtrace apm_grouped_slos --live --from now-1w --to now
 *
 * Scenario options (via --scenarioOpts):
 * - tpm (number, default: 60): transactions per minute per service.
 * - environment (string, default: 'production'): service.environment for every
 *   generated service. Kept as 'production' so it lines up with the default
 *   environment you pick when creating an APM SLO.
 *
 * Suggested manual SLOs to create after ingesting (Observability -> SLOs -> Create):
 * - APM latency SLO: service `*`, environment `production`, transaction type
 *   `request`, threshold `500ms`, groupBy `service.name`
 *     -> `synth-grouped-payments` instance should be VIOLATED, others HEALTHY.
 * - APM availability (error-rate) SLO: service `*`, environment `production`,
 *   transaction type `request`, groupBy `service.name`
 *     -> `synth-grouped-cart` instance should be VIOLATED, others HEALTHY.
 *
 * Then verify:
 * - APM -> Services -> open any of the `synth-grouped-*` services -> SLOs tab
 *   shows the grouped instance for that service.
 * - The SLO grouped-stats endpoint buckets these instances by service.
 *
 * Validation (Kibana Dev Tools):
 *   POST traces-apm*\/_search
 *   {
 *     "size": 0,
 *     "query": { "bool": { "filter": [
 *       { "range": { "@timestamp": { "gte": "now-1w" } } },
 *       { "term": { "service.environment": "production" } },
 *       { "prefix": { "service.name": "synth-grouped-" } }
 *     ] } },
 *     "aggs": {
 *       "services": {
 *         "terms": { "field": "service.name", "size": 20 },
 *         "aggs": { "events": { "terms": { "field": "event.outcome" } } }
 *       }
 *     }
 *   }
 */

import type { ApmFields, Instance } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import type { Scenario } from '@kbn/synthtrace';
import { withClient } from '@kbn/synthtrace';

const DEFAULT_SCENARIO_OPTS = {
  tpm: 60,
  environment: 'production',
};

interface ServiceProfile {
  name: string;
  transactionName: string;
  durationMs: number;
  errorRate: number;
}

const SERVICE_PROFILES: ServiceProfile[] = [
  {
    name: 'synth-grouped-checkout',
    transactionName: 'POST /api/checkout',
    durationMs: 150,
    errorRate: 0,
  },
  {
    name: 'synth-grouped-catalog',
    transactionName: 'GET /api/catalog',
    durationMs: 200,
    errorRate: 0,
  },
  {
    name: 'synth-grouped-payments',
    transactionName: 'POST /api/payments',
    durationMs: 900,
    errorRate: 0,
  },
  {
    name: 'synth-grouped-cart',
    transactionName: 'GET /api/cart',
    durationMs: 180,
    errorRate: 0.4,
  },
];

function assertNoUnknownScenarioOpts(opts: Record<string, unknown>) {
  const unknown = Object.keys(opts).filter((key) => !(key in DEFAULT_SCENARIO_OPTS));
  if (unknown.length) {
    throw new Error(`Unknown scenarioOpts: ${unknown.join(', ')}`);
  }
}

const scenario: Scenario<ApmFields> = async (runOptions) => {
  const scenarioOpts = (runOptions.scenarioOpts ?? {}) as Record<string, unknown>;
  assertNoUnknownScenarioOpts(scenarioOpts);

  const opts = { ...DEFAULT_SCENARIO_OPTS, ...scenarioOpts } as typeof DEFAULT_SCENARIO_OPTS;

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const { logger } = runOptions;

      const services = SERVICE_PROFILES.map((profile) => ({
        profile,
        instance: apm
          .service({ name: profile.name, environment: opts.environment, agentName: 'nodejs' })
          .instance('instance-a'),
      }));

      const instanceEvents = ({
        profile,
        instance,
      }: {
        profile: ServiceProfile;
        instance: Instance;
      }) => {
        const failedRate = Math.round(opts.tpm * profile.errorRate);
        const successfulRate = Math.max(opts.tpm - failedRate, 0);

        const successful =
          successfulRate > 0
            ? range
                .interval('1m')
                .rate(successfulRate)
                .generator((timestamp) =>
                  instance
                    .transaction({ transactionName: profile.transactionName })
                    .timestamp(timestamp)
                    .duration(profile.durationMs)
                    .success()
                    .children(
                      instance
                        .span({
                          spanName: 'GET apm-*/_search',
                          spanType: 'db',
                          spanSubtype: 'elasticsearch',
                        })
                        .timestamp(timestamp)
                        .duration(Math.round(profile.durationMs * 0.6))
                        .success()
                        .destination('elasticsearch')
                    )
                )
            : [];

        const failed =
          failedRate > 0
            ? range
                .interval('1m')
                .rate(failedRate)
                .generator((timestamp) =>
                  instance
                    .transaction({ transactionName: profile.transactionName })
                    .timestamp(timestamp)
                    .duration(profile.durationMs)
                    .failure()
                    .errors(
                      instance
                        .error({
                          message: '[ResponseError] downstream unavailable',
                          type: 'ResponseError',
                        })
                        .timestamp(timestamp + 50)
                    )
                )
            : [];

        const metricsets = range
          .interval('30s')
          .rate(1)
          .generator((timestamp) =>
            instance
              .appMetrics({
                'system.memory.actual.free': 800,
                'system.memory.total': 1000,
                'system.cpu.total.norm.pct': 0.6,
                'system.process.cpu.total.norm.pct': 0.7,
              })
              .timestamp(timestamp)
          );

        return [successful, failed, metricsets].flat();
      };

      return withClient(
        apmEsClient,
        logger.perf('generating_apm_grouped_slos_events', () =>
          services.flatMap((service) => instanceEvents(service))
        )
      );
    },
  };
};

export default scenario;
