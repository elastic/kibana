/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CollectorFetchContext, UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { StoredSLO } from '../../domain/models';
import { SO_SLO_TYPE } from '../../saved_objects';

const SLO_USAGE_COLLECTOR_TYPE = 'slo';

interface Usage {
  slo: {
    total: number;
    by_status: {
      enabled: number;
      disabled: number;
    };
    by_sli_type: {
      [sli_type: string]: number;
    };
    by_rolling_duration: {
      [duration: string]: number;
    };
    by_calendar_aligned_duration: {
      [duration: string]: number;
    };
    by_budgeting_method: {
      occurrences: number;
      timeslices: number;
    };
  };
}

export function registerSloUsageCollector(usageCollection?: UsageCollectionSetup): void {
  if (!usageCollection) {
    return;
  }

  const myCollector = usageCollection.makeUsageCollector<Usage>({
    type: SLO_USAGE_COLLECTOR_TYPE,
    schema: {
      slo: {
        total: {
          type: 'long',
          _meta: {
            description: 'The total number of slos in the cluster',
          },
        },
        by_status: {
          enabled: {
            type: 'long',
            _meta: {
              description: 'The number of enabled slos in the cluster',
            },
          },
          disabled: {
            type: 'long',
            _meta: {
              description: 'The number of disabled slos in the cluster',
            },
          },
        },
        by_sli_type: {
          DYNAMIC_KEY: {
            type: 'long',
            _meta: {
              description: 'The number of slos by sli type in the cluster',
            },
          },
        },
        by_rolling_duration: {
          DYNAMIC_KEY: {
            type: 'long',
            _meta: {
              description: 'The number of slos by rolling duration in the cluster',
            },
          },
        },
        by_calendar_aligned_duration: {
          DYNAMIC_KEY: {
            type: 'long',
            _meta: {
              description: 'The number of slos by calendar aligned duration in the cluster',
            },
          },
        },
        by_budgeting_method: {
          occurrences: {
            type: 'long',
            _meta: {
              description: 'The number of slos by timeslices budgeting method in the cluster',
            },
          },
          timeslices: {
            type: 'long',
            _meta: {
              description: 'The number of slos by occurrences budgeting method in the cluster',
            },
          },
        },
      },
    },
    isReady: () => true,

    fetch: async (context: CollectorFetchContext) => {
      const finder = await context.soClient.createPointInTimeFinder<StoredSLO>({
        type: SO_SLO_TYPE,
        perPage: 100,
      });

      let usage: Usage['slo'] = {
        total: 0,
        by_status: {
          enabled: 0,
          disabled: 0,
        },
        by_sli_type: {},
        by_rolling_duration: {},
        by_calendar_aligned_duration: {},
        by_budgeting_method: {
          occurrences: 0,
          timeslices: 0,
        },
      };

      for await (const response of finder.find()) {
        usage = response.saved_objects.reduce((acc, so) => {
          return {
            ...acc,
            total: acc.total + 1,
            by_status: {
              ...acc.by_status,
              ...(so.attributes.enabled && { enabled: acc.by_status.enabled + 1 }),
              ...(!so.attributes.enabled && { disabled: acc.by_status.disabled + 1 }),
            },
            by_sli_type: {
              ...acc.by_sli_type,
              [so.attributes.indicator.type]:
                (acc.by_sli_type[so.attributes.indicator.type] ?? 0) + 1,
            },
            by_rolling_duration: {
              ...acc.by_rolling_duration,
              ...('isRolling' in so.attributes.timeWindow && {
                [so.attributes.timeWindow.duration]:
                  (acc.by_rolling_duration[so.attributes.timeWindow.duration] ?? 0) + 1,
              }),
            },
            by_calendar_aligned_duration: {
              ...acc.by_calendar_aligned_duration,
              ...('calendar' in so.attributes.timeWindow && {
                [so.attributes.timeWindow.duration]:
                  (acc.by_calendar_aligned_duration[so.attributes.timeWindow.duration] ?? 0) + 1,
              }),
            },
            by_budgeting_method: {
              ...acc.by_budgeting_method,
              ...(so.attributes.budgetingMethod === 'occurrences' && {
                occurrences: acc.by_budgeting_method.occurrences + 1,
              }),
              ...(so.attributes.budgetingMethod === 'timeslices' && {
                timeslices: acc.by_budgeting_method.timeslices + 1,
              }),
            },
          };
        }, usage);
      }

      await finder.close();

      return {
        slo: usage,
      };
    },
  });

  // register usage collector
  usageCollection.registerCollector(myCollector);
}
