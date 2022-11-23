/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ClusterBucket, getClustersFromAggs } from './get_clusters';

const mockClusterBuckets: ClusterBucket[] = [
  {
    key: 'cluster_id',
    doc_count: 10,
    latestFindingTopHit: {
      hits: {
        hits: [
          {
            _id: '123',
            _index: '123',
            _source: {
              orchestrator: {
                cluster: {
                  name: 'cluster_name',
                },
              },
              rule: { benchmark: { name: 'CIS Kubernetes', id: 'cis_k8s' } },
              '@timestamp': '123',
            },
          },
        ],
      },
    },
    failed_findings: {
      doc_count: 6,
    },
    passed_findings: {
      doc_count: 6,
    },
    aggs_by_resource_type: {
      buckets: [
        {
          key: 'foo_type',
          doc_count: 6,
          failed_findings: {
            doc_count: 3,
          },
          passed_findings: {
            doc_count: 3,
          },
          score: {
            value: 0.5,
          },
        },
        {
          key: 'boo_type',
          doc_count: 6,
          failed_findings: {
            doc_count: 3,
          },
          passed_findings: {
            doc_count: 3,
          },
          score: {
            value: 0.5,
          },
        },
      ],
    },
  },
];

describe('getClustersFromAggs', () => {
  it('should return value matching ComplianceDashboardData["clusters"]', async () => {
    const clusters = getClustersFromAggs(mockClusterBuckets);
    expect(clusters).toEqual([
      {
        meta: {
          lastUpdate: '123',
          clusterName: 'cluster_name',
          clusterId: 'cluster_id',
          benchmarkName: 'CIS Kubernetes',
          benchmarkId: 'cis_k8s',
        },
        stats: {
          totalFindings: 12,
          totalFailed: 6,
          totalPassed: 6,
          postureScore: 50.0,
        },
        groupedFindingsEvaluation: [
          {
            name: 'foo_type',
            totalFindings: 6,
            totalFailed: 3,
            totalPassed: 3,
            postureScore: 50.0,
          },
          {
            name: 'boo_type',
            totalFindings: 6,
            totalFailed: 3,
            totalPassed: 3,
            postureScore: 50.0,
          },
        ],
      },
    ]);
  });
});
