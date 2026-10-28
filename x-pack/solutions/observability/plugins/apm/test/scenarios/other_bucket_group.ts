/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Generates APM data with a high number of unique transaction and service names to test the "other" bucket.
 */

import type { ApmFields } from '@kbn/synthtrace-client';
import { apm } from '@kbn/synthtrace-client';
import { range as lodashRange } from 'lodash';
import type { Scenario } from '@kbn/synthtrace';
import { getSynthtraceEnvironment } from '@kbn/synthtrace';
import { withClient } from '@kbn/synthtrace';
import { getNumberOpt } from '@kbn/synthtrace';

const ENVIRONMENTS = ['production', 'development'].map((env) =>
  getSynthtraceEnvironment(__filename, env)
);

const scenario: Scenario<ApmFields> = async ({ logger, scenarioOpts }) => {
  const numServices = getNumberOpt(scenarioOpts, 'services', 10);
  const numTxGroups = getNumberOpt(scenarioOpts, 'txGroups', 10);

  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      const TRANSACTION_TYPES = ['request'];

      const MIN_DURATION = 10;
      const MAX_DURATION = 1000;

      const MAX_BUCKETS = 50;

      const BUCKET_SIZE = (MAX_DURATION - MIN_DURATION) / MAX_BUCKETS;

      const serviceRange = [
        ...lodashRange(0, numServices).map((groupId) => `service-${groupId}`),
        '_other',
      ];

      const instances = serviceRange.flatMap((serviceName) => {
        const services = ENVIRONMENTS.map((env) => apm.service(serviceName, env, 'go'));

        return lodashRange(0, 2).flatMap((serviceNodeId) =>
          services.map((service) => service.instance(`${serviceName}-${serviceNodeId}`))
        );
      });

      const transactionGroupRange = [
        ...lodashRange(0, numTxGroups).map((groupId) => `transaction-${groupId}`),
        '_other',
      ];

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
                  transactionGroupRange.flatMap((groupId, groupIndex) => {
                    const duration = Math.round(
                      (timestampIndex % MAX_BUCKETS) * BUCKET_SIZE + MIN_DURATION
                    );

                    if (groupId === '_other') {
                      return instance
                        .transaction(groupId)
                        .timestamp(timestamp)
                        .duration(duration)
                        .defaults({
                          'transaction.aggregation.overflow_count': 10,
                        });
                    }

                    return instance
                      .transaction(
                        groupId,
                        TRANSACTION_TYPES[groupIndex % TRANSACTION_TYPES.length]
                      )
                      .timestamp(timestamp)
                      .duration(duration)
                      .success();
                  })
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
