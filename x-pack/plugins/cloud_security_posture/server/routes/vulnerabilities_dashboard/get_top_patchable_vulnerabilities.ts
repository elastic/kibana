/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { PatchableVulnerabilityStat } from '../../../common/types';
import { LATEST_VULNERABILITIES_INDEX_DEFAULT_NS } from '../../../common/constants';

interface VulnerabilityBucket {
  key: string | undefined;
  doc_count?: number;
  cve: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: Array<{
      key?: string;
      doc_count?: string;
    }>;
  };
  score: {
    value: number;
  };
  version: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: Array<{
      key?: string;
      doc_count?: string;
    }>;
  };
}

export interface PatchableVulnerabilitiesQueryResult {
  patchable_vulnerabilities: {
    buckets: VulnerabilityBucket[];
  };
}

const getPatchableVulnerabilitiesQuery = (query: QueryDslQueryContainer): SearchRequest => ({
  size: 0,
  query,
  index: LATEST_VULNERABILITIES_INDEX_DEFAULT_NS,
  aggs: {
    patchable_vulnerabilities: {
      terms: {
        field: 'package.fixed_version',
        order: {
          _count: 'desc',
        },
        size: 10,
      },
      aggs: {
        cve: {
          terms: {
            field: 'vulnerability.id',
            size: 1,
          },
        },
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
      },
    },
  },
});

export const getTopPatchableVulnerabilities = async (
  esClient: ElasticsearchClient,
  query: QueryDslQueryContainer
): Promise<PatchableVulnerabilityStat[]> => {
  const queryResult = await esClient.search<unknown, PatchableVulnerabilitiesQueryResult>(
    getPatchableVulnerabilitiesQuery(query)
  );

  if (!queryResult?.aggregations?.patchable_vulnerabilities) return [];

  return queryResult.aggregations.patchable_vulnerabilities.buckets.map(
    (patchableVulnerability: VulnerabilityBucket) => ({
      cve: patchableVulnerability.cve?.buckets?.[0]?.key ?? '',
      score: patchableVulnerability.score?.value,
      version: patchableVulnerability.version?.buckets?.[0]?.key ?? '',
      packageFixVersion: patchableVulnerability.key,
      vulnerabilityFixCount: patchableVulnerability.doc_count,
    })
  );
};
