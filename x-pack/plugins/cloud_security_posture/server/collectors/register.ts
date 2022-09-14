/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CollectorFetchContext, UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../../common/constants';
import { getFindingsUsage, IndexCounter } from './findings_stats_collector';

interface CSPMUsage {
  findings: IndexCounter;
  latest_findings: IndexCounter;
  score: IndexCounter;
}

export function registerIndicesCounterCollector(usageCollection?: UsageCollectionSetup): void {
  // usageCollection is an optional dependency, so make sure to return if it is not registered.
  if (!usageCollection) {
    return;
  }

  // create usage collector
  const indicesCounterCollector = usageCollection.makeUsageCollector<CSPMUsage>({
    type: CLOUD_SECURITY_POSTURE_PACKAGE_NAME,

    isReady: () => true,
    fetch: async (collectorFetchContext: CollectorFetchContext) => {
      await getFindingsUsage(collectorFetchContext.esClient);
      return {
        findings: {
          doc_count: 5,
        },
        latest_findings: {
          doc_count: 5,
        },
        score: {
          doc_count: 5,
        },
      };
    },
    schema: {
      findings: {
        doc_count: {
          type: 'long',
          _meta: {
            description: 'The total number of enrolled agents, in any state',
          },
        },
      },
      latest_findings: {
        doc_count: {
          type: 'long',
          _meta: {
            description: 'The total number of enrolled agents, in any state',
          },
        },
      },
      score: {
        doc_count: {
          type: 'long',
          _meta: {
            description: 'The total number of enrolled agents, in any state',
          },
        },
      },
    },
  });
  // register usage collector
  usageCollection.registerCollector(indicesCounterCollector);
  console.log('Register!!');
}
