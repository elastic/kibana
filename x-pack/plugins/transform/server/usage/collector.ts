/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { getResultTestConfig } from '../../common/utils/alerts';
import type { TransformHealthRuleParams } from '../../common/types/alerting';
import { TRANSFORM_RULE_TYPE } from '../../common';

export interface TransformAlertsUsageData {
  alertRules: {
    transform_health: {
      count_by_check_type: {
        notStarted: number;
        errorMessages: number;
        healthCheck: number;
      };
    };
  };
}

export function registerCollector(
  usageCollection: UsageCollectionSetup,
  getAlertIndex: () => Promise<string>
) {
  const collector = usageCollection.makeUsageCollector<TransformAlertsUsageData>({
    type: 'transform',
    schema: {
      alertRules: {
        transform_health: {
          count_by_check_type: {
            notStarted: {
              type: 'long',
              _meta: {
                description:
                  'total number of alerting rules performing the not started health check',
              },
            },
            errorMessages: {
              type: 'long',
              _meta: {
                description:
                  'total number of alerting rules performing the error message health check',
              },
            },
            healthCheck: {
              type: 'long',
              _meta: {
                description:
                  'total number of alerting rules performing the health check with the stats API',
              },
            },
          },
        },
      },
    },
    isReady: () => true,
    fetch: async ({ esClient }) => {
      const transformHealthRuleInstances = await esClient.search<{
        alert: {
          params: TransformHealthRuleParams;
        };
      }>(
        {
          index: await getAlertIndex(),
          size: 10000,
          query: {
            bool: {
              filter: [
                { term: { type: 'alert' } },
                {
                  term: {
                    'alert.alertTypeId': TRANSFORM_RULE_TYPE.TRANSFORM_HEALTH,
                  },
                },
              ],
            },
          },
        },
        { maxRetries: 0 }
      );

      const resultsByCheckType = transformHealthRuleInstances.hits.hits.reduce(
        (acc, curr) => {
          const doc = curr._source;
          if (!doc) return acc;

          const {
            alert: {
              params: { testsConfig },
            },
          } = doc;

          const resultConfig = getResultTestConfig(testsConfig);

          acc.notStarted += resultConfig?.notStarted?.enabled ? 1 : 0;
          acc.errorMessages += resultConfig?.errorMessages?.enabled ? 1 : 0;
          acc.healthCheck += resultConfig?.healthCheck?.enabled ? 1 : 0;

          return acc;
        },
        {
          notStarted: 0,
          errorMessages: 0,
          healthCheck: 0,
        }
      );

      return {
        alertRules: {
          [TRANSFORM_RULE_TYPE.TRANSFORM_HEALTH]: {
            count_by_check_type: resultsByCheckType,
          },
        },
      };
    },
  });

  usageCollection.registerCollector(collector);
}
