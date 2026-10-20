/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates one APM service per entry in the metrics dashboard catalog, covering
 * all static dashboard types (classic APM, EDOT, vanilla OTel, OTel-native) plus
 * non-dashboard variations (JRuby JVM metrics, Go classic agent, Ruby classic).
 *
 * Each service emits transactions and the exact metric fields its corresponding
 * dashboard panels query so the panels render with data.
 *
 * Usage:
 *   node scripts/synthtrace apm_metrics_dashboards --live
 */

import type { ApmFields } from '@kbn/synthtrace-client';
import type { Scenario } from '@kbn/synthtrace';
import { getSynthtraceEnvironment } from '@kbn/synthtrace';
import { withClient } from '@kbn/synthtrace';
import {
  APM_METRICS_ALL_SERVICES,
  createMetricsServiceInstance,
  generateAppMetrics,
} from '@kbn/synthtrace';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

const scenario: Scenario<ApmFields> = async () => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const instances = APM_METRICS_ALL_SERVICES.map((config) =>
        createMetricsServiceInstance(config, ENVIRONMENT)
      );

      return withClient(
        apmEsClient,
        instances.flatMap(({ instance, config }) => [
          range
            .interval('1m')
            .rate(10)
            .generator((timestamp) =>
              instance
                .transaction({ transactionName: 'GET /api/data' })
                .timestamp(timestamp)
                .duration(200)
                .success()
            ),
          range
            .interval('30s')
            .rate(1)
            .generator((timestamp) => generateAppMetrics(instance, config, timestamp)),
        ])
      );
    },
  };
};

export default scenario;
