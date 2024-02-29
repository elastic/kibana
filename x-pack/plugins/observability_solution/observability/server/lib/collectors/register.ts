/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { fetcher } from './fetcher';
import type { Usage } from './type';

export function registerSloUsageCollector(usageCollection?: UsageCollectionSetup): void {
  if (!usageCollection) {
    return;
  }

  const sloUsageCollector = usageCollection.makeUsageCollector<Usage>({
    type: 'slo',
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
    fetch: fetcher,
  });

  // register usage collector
  usageCollection.registerCollector(sloUsageCollector);
}
