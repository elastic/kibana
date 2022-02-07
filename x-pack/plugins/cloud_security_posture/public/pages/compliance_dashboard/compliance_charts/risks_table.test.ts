/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTop5Risks, RisksTableProps } from './risks_table';

const podsAgg = {
  resourceType: 'pods',
  totalFindings: 2,
  totalPassed: 1,
  totalFailed: 1,
};

const etcdAgg = {
  resourceType: 'etcd',
  totalFindings: 5,
  totalPassed: 0,
  totalFailed: 5,
};

const clusterAgg = {
  resourceType: 'cluster',
  totalFindings: 2,
  totalPassed: 2,
  totalFailed: 0,
};

const systemAgg = {
  resourceType: 'system',
  totalFindings: 10,
  totalPassed: 6,
  totalFailed: 4,
};

const apiAgg = {
  resourceType: 'api',
  totalFindings: 19100,
  totalPassed: 2100,
  totalFailed: 17000,
};

const serverAgg = {
  resourceType: 'server',
  totalFindings: 7,
  totalPassed: 4,
  totalFailed: 3,
};

const mockData: RisksTableProps['data'] = [
  podsAgg,
  etcdAgg,
  clusterAgg,
  systemAgg,
  apiAgg,
  serverAgg,
];

describe('getTop5Risks', () => {
  it('returns sorted by failed findings', () => {
    expect(getTop5Risks([systemAgg, etcdAgg, apiAgg])).toEqual([apiAgg, etcdAgg, systemAgg]);
  });

  it('return array filtered with failed findings only', () => {
    expect(getTop5Risks([systemAgg, clusterAgg, apiAgg])).toEqual([apiAgg, systemAgg]);
  });

  it('return sorted and filtered array with no more then 5 elements', () => {
    expect(getTop5Risks(mockData)).toEqual([apiAgg, etcdAgg, systemAgg, serverAgg, podsAgg]);
  });
});
