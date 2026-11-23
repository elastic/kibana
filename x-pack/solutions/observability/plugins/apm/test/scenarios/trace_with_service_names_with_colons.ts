/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates APM traces for services whose names contain a colon (as produced by OpenTelemetry SDKs
 * that fall back to `unknown_service:<language>`), alongside a plainly named control service.
 *
 * Use this to exercise linked custom dashboards: link a dashboard to `synth-node` first, then to
 * `unknown_service:java`, and check that both services still render their dashboards.
 * See https://github.com/elastic/kibana/issues/245023
 *
 * Only transactions, spans and errors are generated. App metrics are deliberately omitted: they are
 * routed to `metrics-apm.app.<service.name>-<namespace>` (see `get_routing_transform.ts`), and
 * Elasticsearch rejects a data stream name containing `:`, so every such document would be dropped
 * with `illegal_argument_exception`. The dashboards route matches metric OR transaction events, so
 * transactions alone are enough here.
 */

import type { ApmFields, Instance } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import type { Scenario } from '@kbn/synthtrace';
import { getSynthtraceEnvironment, withClient } from '@kbn/synthtrace';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const SERVICES = [
  // Control service with a name that is already valid KQL.
  { name: 'synth-node', agentName: 'nodejs' },
  { name: 'unknown_service:java', agentName: 'java' },
  { name: 'unknown_service:dotnet', agentName: 'dotnet' },
];

const scenario: Scenario<ApmFields> = async (runOptions) => {
  const { logger } = runOptions;

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const transactionName = 'GET /api/product/list';

      const successfulTimestamps = range.interval('1m').rate(60);
      const failedTimestamps = range.interval('1m').rate(10);

      const instances = SERVICES.map(({ name, agentName }) =>
        apm.service({ name, environment: ENVIRONMENT, agentName }).instance('instance-1')
      );

      const instanceSpans = (instance: Instance) => {
        const successfulTraceEvents = successfulTimestamps.generator((timestamp) =>
          instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(1000)
            .success()
            .children(
              instance
                .span({
                  spanName: 'GET apm-*/_search',
                  spanType: 'db',
                  spanSubtype: 'elasticsearch',
                })
                .duration(900)
                .success()
                .destination('elasticsearch')
                .timestamp(timestamp)
            )
        );

        const failedTraceEvents = failedTimestamps.generator((timestamp) =>
          instance
            .transaction({ transactionName })
            .timestamp(timestamp)
            .duration(1000)
            .failure()
            .errors(
              instance
                .error({
                  message: '[ResponseError] index_not_found_exception',
                  type: 'ResponseError',
                })
                .timestamp(timestamp + 50)
            )
        );

        return [successfulTraceEvents, failedTraceEvents];
      };

      return withClient(
        apmEsClient,
        logger.perf('generating_apm_events', () =>
          instances.flatMap((instance) => instanceSpans(instance))
        )
      );
    },
  };
};

export default scenario;
