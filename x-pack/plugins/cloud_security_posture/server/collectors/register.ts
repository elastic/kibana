/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CollectorFetchContext, UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../../common/constants';
import { FindingsUsage, getFindingsUsage } from './findings_stats_collector';

interface Usage {
  findings_stats: FindingsUsage;
}

export function registerIndicesCounterCollector(usageCollection?: UsageCollectionSetup): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered.
  if (!usageCollection) {
    return;
  }

  // create usage collector
  const indicesCounterCollector = usageCollection.makeUsageCollector<Usage>({
    type: CLOUD_SECURITY_POSTURE_PACKAGE_NAME,

    isReady: () => true,
    fetch: async (collectorFetchContext: CollectorFetchContext) => {
      await getFindingsUsage(collectorFetchContext.esClient);
      return {
        findings_stats: {
          benchmark: 'boo',
          total: 5,
          passed: 5,
          failed: 8,
          k8s_object: {
            total: 5,
            passed: 5,
            failed: 8,
          },
          process: {
            total: 5,
            passed: 5,
            failed: 8,
          },
          file: {
            total: 5,
            passed: 5,
            failed: 8,
          },
          load_balancer: {
            total: 5,
            passed: 5,
            failed: 8,
          },
        },
      };
    },
    schema: {
      findings_stats: {
        benchmark: {
          type: 'keyword',
          _meta: {
            description: 'The total number of enrolled agents, in any state',
          },
        },
        total: {
          type: 'long',
          _meta: {
            description: 'The total number of enrolled agents, in any state',
          },
        },
        passed: {
          type: 'long',
          _meta: {
            description: 'The total number of enrolled agents, in any state',
          },
        },
        failed: {
          type: 'long',
          _meta: {
            description: 'The total number of enrolled agents, in any state',
          },
        },
        k8s_object: {
          total: {
            type: 'long',
            _meta: {
              description: 'The total number of enrolled agents, in any state',
            },
          },
          passed: {
            type: 'long',
            _meta: {
              description: 'The total number of enrolled agents, in any state',
            },
          },
          failed: {
            type: 'long',
            _meta: {
              description: 'The total number of enrolled agents, in any state',
            },
          },
        },
        process: {
          total: {
            type: 'long',
            _meta: {
              description: 'The total number of enrolled agents, in any state',
            },
          },
          passed: {
            type: 'long',
            _meta: {
              description: 'The total number of enrolled agents, in any state',
            },
          },
          failed: {
            type: 'long',
            _meta: {
              description: 'The total number of enrolled agents, in any state',
            },
          },
        },
        file: {
          total: {
            type: 'long',
            _meta: {
              description: 'The total number of enrolled agents, in any state',
            },
          },
          passed: {
            type: 'long',
            _meta: {
              description: 'The total number of enrolled agents, in any state',
            },
          },
          failed: {
            type: 'long',
            _meta: {
              description: 'The total number of enrolled agents, in any state',
            },
          },
        },
        load_balancer: {
          total: {
            type: 'long',
            _meta: {
              description: 'The total number of enrolled agents, in any state',
            },
          },
          passed: {
            type: 'long',
            _meta: {
              description: 'The total number of enrolled agents, in any state',
            },
          },
          failed: {
            type: 'long',
            _meta: {
              description: 'The total number of enrolled agents, in any state',
            },
          },
        },
      },
    },
    // register usage collector
  });
  usageCollection.registerCollector(indicesCounterCollector);
  console.log('Register!!');
}
