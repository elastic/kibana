/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN } from '@kbn/cloud-security-posture-common';
import { VulnerabilityStat } from '../../../common/types_old';

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
  cveVersion: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: Array<{
      key?: string;
      doc_count?: string;
    }>;
  };
  packageName: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: Array<{
      key?: string;
      doc_count?: string;
    }>;
  };
  packageVersion: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: Array<{
      key?: string;
      doc_count?: string;
    }>;
  };
  severity: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: Array<{
      key?: string;
      doc_count?: string;
    }>;
  };
  packageFixVersion: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    buckets: Array<{
      key?: string;
      doc_count?: string;
    }>;
  };
}

export interface VulnerabilitiesQueryResult {
  vulnerabilities: {
    buckets: VulnerabilityBucket[];
  };
}

const getVulnerabilitiesQuery = (): SearchRequest => ({
  size: 0,
  query: {
    match_all: {},
  },
  index: CDR_LATEST_NATIVE_VULNERABILITIES_INDEX_PATTERN,
  aggs: {
    vulnerabilities: {
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
        cveVersion: {
          terms: {
            field: 'vulnerability.score.version',
          },
        },
        severity: {
          terms: {
            field: 'vulnerability.severity',
            size: 1,
          },
        },
        packageFixVersion: {
          terms: {
            field: 'package.fixed_version',
            size: 1,
          },
        },
        packageName: {
          terms: {
            field: 'package.name',
            size: 1,
          },
        },
        packageVersion: {
          terms: {
            field: 'package.version',
            size: 1,
          },
        },
      },
    },
  },
});

export const getTopVulnerabilities = async (
  esClient: ElasticsearchClient
): Promise<VulnerabilityStat[]> => {
  const queryResult = await esClient.search<unknown, VulnerabilitiesQueryResult>(
    getVulnerabilitiesQuery()
  );

  if (!queryResult?.aggregations?.vulnerabilities) return [];

  return queryResult.aggregations.vulnerabilities.buckets.map(
    (vulnerability: VulnerabilityBucket) => ({
      cve: vulnerability.key,
      packageFixVersion: vulnerability.packageFixVersion?.buckets?.[0]?.key ?? '',
      packageName: vulnerability.packageName?.buckets?.[0]?.key ?? '',
      packageVersion: vulnerability.packageVersion?.buckets?.[0]?.key ?? '',
      severity: vulnerability.severity?.buckets?.[0]?.key ?? '',
      vulnerabilityCount: vulnerability.doc_count,
      cvss: {
        score: vulnerability.score?.value,
        version: vulnerability.cveVersion?.buckets?.[0]?.key ?? '',
      },
    })
  );
};
