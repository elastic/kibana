/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTopRisks, RisksTableProps } from './risks_table';

const podsAgg = {
  name: 'pods',
  totalFindings: 2,
  totalPassed: 1,
  totalFailed: 1,
};

const etcdAgg = {
  name: 'etcd',
  totalFindings: 5,
  totalPassed: 0,
  totalFailed: 5,
};

const clusterAgg = {
  name: 'cluster',
  totalFindings: 2,
  totalPassed: 2,
  totalFailed: 0,
};

const systemAgg = {
  name: 'system',
  totalFindings: 10,
  totalPassed: 6,
  totalFailed: 4,
};

const apiAgg = {
  name: 'api',
  totalFindings: 19100,
  totalPassed: 2100,
  totalFailed: 17000,
};

const serverAgg = {
  name: 'server',
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

describe('getTopRisks', () => {
  it('returns sorted by failed findings', () => {
    expect(getTopRisks([systemAgg, etcdAgg, apiAgg], 3)).toEqual([apiAgg, etcdAgg, systemAgg]);
  });

  it('return array filtered with failed findings only', () => {
    expect(getTopRisks([systemAgg, clusterAgg, apiAgg], 3)).toEqual([apiAgg, systemAgg]);
  });

  it('return sorted and filtered array with the correct number of elements', () => {
    expect(getTopRisks(mockData, 5)).toEqual([apiAgg, etcdAgg, systemAgg, serverAgg, podsAgg]);
  });
});
