/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ComplianceDashboardData } from '../../../common/types';

export const clusterMockData = {
  meta: {
    clusterId: '8f9c5b98-cc02-4827-8c82-316e2cc25870',
    benchmarkName: 'CIS Kubernetes V1.20',
    lastUpdate: '2022-11-07T13:14:34.990Z',
    benchmarkId: 'cis_k8s',
  },
  stats: {
    totalFailed: 17,
    totalPassed: 155,
    totalFindings: 172,
    postureScore: 90.1,
  },
  groupedFindingsEvaluation: [
    {
      name: 'RBAC and Service Accounts',
      totalFindings: 104,
      totalFailed: 0,
      totalPassed: 104,
      postureScore: 100,
    },
    {
      name: 'API Server',
      totalFindings: 27,
      totalFailed: 11,
      totalPassed: 16,
      postureScore: 59.2,
    },
    {
      name: 'Master Node Configuration Files',
      totalFindings: 17,
      totalFailed: 1,
      totalPassed: 16,
      postureScore: 94.1,
    },
    {
      name: 'Kubelet',
      totalFindings: 11,
      totalFailed: 4,
      totalPassed: 7,
      postureScore: 63.6,
    },
    {
      name: 'etcd',
      totalFindings: 6,
      totalFailed: 0,
      totalPassed: 6,
      postureScore: 100,
    },
    {
      name: 'Worker Node Configuration Files',
      totalFindings: 5,
      totalFailed: 0,
      totalPassed: 5,
      postureScore: 100,
    },
    {
      name: 'Scheduler',
      totalFindings: 2,
      totalFailed: 1,
      totalPassed: 1,
      postureScore: 50.0,
    },
  ],
  trend: [
    {
      timestamp: '2022-05-22T11:03:00.000Z',
      totalFindings: 172,
      totalFailed: 17,
      totalPassed: 155,
      postureScore: 90.1,
    },
    {
      timestamp: '2022-05-22T10:25:00.000Z',
      totalFindings: 172,
      totalFailed: 17,
      totalPassed: 155,
      postureScore: 90.1,
    },
  ],
};

export const mockDashboardData: ComplianceDashboardData = {
  stats: {
    totalFailed: 17,
    totalPassed: 155,
    totalFindings: 172,
    postureScore: 90.1,
    resourcesEvaluated: 162,
  },
  groupedFindingsEvaluation: [
    {
      name: 'RBAC and Service Accounts',
      totalFindings: 104,
      totalFailed: 0,
      totalPassed: 104,
      postureScore: 100,
    },
    {
      name: 'API Server',
      totalFindings: 27,
      totalFailed: 11,
      totalPassed: 16,
      postureScore: 59.2,
    },
    {
      name: 'Master Node Configuration Files',
      totalFindings: 17,
      totalFailed: 1,
      totalPassed: 16,
      postureScore: 94.1,
    },
    {
      name: 'Kubelet',
      totalFindings: 11,
      totalFailed: 4,
      totalPassed: 7,
      postureScore: 63.6,
    },
    {
      name: 'etcd',
      totalFindings: 6,
      totalFailed: 0,
      totalPassed: 6,
      postureScore: 100,
    },
    {
      name: 'Worker Node Configuration Files',
      totalFindings: 5,
      totalFailed: 0,
      totalPassed: 5,
      postureScore: 100,
    },
    {
      name: 'Scheduler',
      totalFindings: 2,
      totalFailed: 1,
      totalPassed: 1,
      postureScore: 50.0,
    },
  ],
  clusters: [clusterMockData],
  trend: [
    {
      timestamp: '2022-05-22T11:03:00.000Z',
      totalFindings: 172,
      totalFailed: 17,
      totalPassed: 155,
      postureScore: 90.1,
    },
    {
      timestamp: '2022-05-22T10:25:00.000Z',
      totalFindings: 172,
      totalFailed: 17,
      totalPassed: 155,
      postureScore: 90.1,
    },
  ],
};
