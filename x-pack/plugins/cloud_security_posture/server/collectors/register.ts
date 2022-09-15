/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CollectorFetchContext, UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import {
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
  FINDINGS_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
} from '../../common/constants';
import { CspmIndicesStats, getIndicesStats } from './findings_stats_collector';

interface CspmUsage {
  indices: CspmIndicesStats;
}

export function registerIndicesCounterCollector(usageCollection?: UsageCollectionSetup): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered.
  if (!usageCollection) {
    return;
  }

  // create usage collector
  const indicesCounterCollector = usageCollection.makeUsageCollector<CspmUsage>({
    type: CLOUD_SECURITY_POSTURE_PACKAGE_NAME,
    isReady: () => true,
    fetch: async (collectorFetchContext: CollectorFetchContext) => {
      const indicesStats = await getIndicesStats(collectorFetchContext.esClient);
      return {
        indices: indicesStats,
      };
    },
    schema: {
      indices: {
        findings: {
          doc_count: {
            type: 'long',
            _meta: {
              description: `The total number of docs for the ${FINDINGS_INDEX_DEFAULT_NS} index`,
            },
          },
          latest_doc_timestamp: {
            type: 'date',
            _meta: {
              description: `The total number of docs for the ${FINDINGS_INDEX_DEFAULT_NS} index`,
            },
          },
        },
        latest_findings: {
          doc_count: {
            type: 'long',
            _meta: {
              description: `The total number of docs for the ${LATEST_FINDINGS_INDEX_DEFAULT_NS} index`,
            },
          },
          latest_doc_timestamp: {
            type: 'date',
            _meta: {
              description: `The total number of docs for the ${FINDINGS_INDEX_DEFAULT_NS} index`,
            },
          },
        },
        score: {
          doc_count: {
            type: 'long',
            _meta: {
              description: `The total number of docs for the ${BENCHMARK_SCORE_INDEX_DEFAULT_NS} index`,
            },
          },
          latest_doc_timestamp: {
            type: 'date',
            _meta: {
              description: `The total number of docs for the ${FINDINGS_INDEX_DEFAULT_NS} index`,
            },
          },
        },
      },
    },
  });

  // register usage collector
  usageCollection.registerCollector(indicesCounterCollector);
}
