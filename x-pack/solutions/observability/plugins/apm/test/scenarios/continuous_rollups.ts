/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates high-cardinality APM data specifically for testing continuous rollups.
 */

import type { ApmFields } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import { merge, range as lodashRange } from 'lodash';
import type { Scenario } from '@kbn/synthtrace';
import { ComponentTemplateName } from '@kbn/synthtrace';
import { getSynthtraceEnvironment } from '@kbn/synthtrace';
import { withClient } from '@kbn/synthtrace';
import { getNumberOpt } from '@kbn/synthtrace';

const ENVIRONMENTS = ['production', 'development'].map((env) =>
  getSynthtraceEnvironment(__filename, env)
);

const scenario: Scenario<ApmFields> = async ({ logger, scenarioOpts }) => {
  const numServices = getNumberOpt(scenarioOpts, 'services', 25);
  const numInstances = getNumberOpt(scenarioOpts, 'instances', 10);
  const numTxGroups = getNumberOpt(scenarioOpts, 'txGroups', 25);

  return {
    bootstrap: async ({ apmEsClient }) => {
      await apmEsClient.updateComponentTemplate(
        ComponentTemplateName.MetricsInternal,
        (template) => {
          const next = {
            settings: {
              index: {
                number_of_shards: 8,
              },
            },
          };

          return merge({}, template, next);
        }
      );
    },
    generate: ({ range, clients: { apmEsClient } }) => {
      const TRANSACTION_TYPES = ['request', 'custom'];

      const MIN_DURATION = 10;
      const MAX_DURATION = 1000;

      const MAX_BUCKETS = 50;

      const BUCKET_SIZE = (MAX_DURATION - MIN_DURATION) / MAX_BUCKETS;

      const OUTCOMES = ['success' as const, 'failure' as const, 'unknown' as const];

      const instances = lodashRange(0, numServices).flatMap((serviceId) => {
        const serviceName = `service-${serviceId}`;

        const services = ENVIRONMENTS.map((env) => apm.service(serviceName, env, 'go'));

        return lodashRange(0, numInstances).flatMap((serviceNodeId) =>
          services.map((service) => service.instance(`${serviceName}-${serviceNodeId}`))
        );
      });

      const transactionGroupRange = lodashRange(0, numTxGroups);

      return withClient(
        apmEsClient,
        range
          .interval('1m')
          .rate(1)
          .generator((timestamp, timestampIndex) => {
            return logger.perf(
              'generate_events_for_timestamp ' + new Date(timestamp).toISOString(),
              () => {
                const events = instances.flatMap((instance) =>
                  transactionGroupRange.flatMap((groupId, groupIndex) =>
                    OUTCOMES.map((outcome) => {
                      const duration = Math.round(
                        (timestampIndex % MAX_BUCKETS) * BUCKET_SIZE + MIN_DURATION
                      );

                      return instance
                        .transaction(
                          `transaction-${groupId}`,
                          TRANSACTION_TYPES[groupIndex % TRANSACTION_TYPES.length]
                        )
                        .timestamp(timestamp)
                        .duration(duration)
                        .outcome(outcome);
                    })
                  )
                );

                return events;
              }
            );
          })
      );
    },
  };
};

export default scenario;
