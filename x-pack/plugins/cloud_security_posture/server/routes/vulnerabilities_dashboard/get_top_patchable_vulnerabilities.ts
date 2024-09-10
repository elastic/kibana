/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { AggFieldBucket, PatchableVulnerabilityStat } from '../../../common/types_old';
import { CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN } from '../../../common/constants';

interface VulnerabilityBucket {
  key: string | undefined;
  doc_count?: number;
  packageFixVersion: AggFieldBucket;
  score: {
    value: number;
  };
  version: AggFieldBucket;
}

export interface PatchableVulnerabilitiesQueryResult {
  patchable_vulnerabilities: {
    buckets: VulnerabilityBucket[];
  };
}

const getPatchableVulnerabilitiesQuery = (): SearchRequest => ({
  size: 0,
  query: {
    bool: {
      filter: [
        {
          exists: {
            field: 'package.fixed_version',
          },
        },
      ],
    },
  },
  index: CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
  aggs: {
    patchable_vulnerabilities: {
      terms: {
        field: 'vulnerability.id',
        order: {
          _count: 'desc',
        },
        size: 10,
      },

      aggs: {
        score: {
          max: {
            field: 'vulnerability.score.base',
          },
        },
        version: {
          terms: {
            field: 'vulnerability.score.version',
            size: 1,
          },
        },
        packageFixVersion: {
          terms: {
            field: 'package.fixed_version',
            size: 1,
          },
        },
      },
    },
  },
});

export const getTopPatchableVulnerabilities = async (
  esClient: ElasticsearchClient
): Promise<PatchableVulnerabilityStat[]> => {
  const queryResult = await esClient.search<unknown, PatchableVulnerabilitiesQueryResult>(
    getPatchableVulnerabilitiesQuery()
  );
  if (!queryResult?.aggregations?.patchable_vulnerabilities) return [];

  return queryResult.aggregations.patchable_vulnerabilities.buckets.map(
    (vulnerability: VulnerabilityBucket) => {
      return {
        cve: vulnerability.key,
        cvss: {
          score: vulnerability.score?.value,
          version: vulnerability.version?.buckets?.[0]?.key ?? '',
        },
        packageFixVersion: vulnerability.packageFixVersion?.buckets?.[0]?.key ?? '',
        vulnerabilityCount: vulnerability.doc_count,
      };
    }
  );
};
