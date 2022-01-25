/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  elasticsearchClientMock,
  ElasticsearchClientMock,
  // eslint-disable-next-line @kbn/eslint/no-restricted-paths
} from 'src/core/server/elasticsearch/client/mocks';

import {
  getBenchmarks,
  getAllFindingsStats,
  roundScore,
  getBenchmarksStats,
  getResourcesEvaluation,
} from './stats';

export const mockCountResultOnce = async (mockEsClient: ElasticsearchClientMock, count: number) => {
  mockEsClient.count.mockReturnValueOnce(
    // @ts-expect-error @elast  ic/elasticsearch Aggregate only allows unknown values
    elasticsearchClientMock.createSuccessTransportRequestPromise({ count })
  );
};

export const mockSearchResultOnce = async (
  mockEsClient: ElasticsearchClientMock,
  returnedMock: object
) => {
  mockEsClient.search.mockReturnValueOnce(
    // @ts-expect-error @elastic/elasticsearch Aggregate only allows unknown values
    elasticsearchClientMock.createSuccessTransportRequestPromise(returnedMock)
  );
};

const mockEsClient = elasticsearchClientMock.createClusterClient().asScoped().asInternalUser;

afterEach(() => {
  jest.clearAllMocks();
});

describe('testing round score', () => {
  it('take decimal and expect the roundScore will return it with one digit after the dot ', async () => {
    const score = roundScore(0.85245);
    expect(score).toEqual(85.2);
  });
});

describe('general cloud posture score', () => {
  it('expect to valid score from getAllFindingsStats', async () => {
    mockCountResultOnce(mockEsClient, 10); // total findings
    mockCountResultOnce(mockEsClient, 3); // pass findings
    mockCountResultOnce(mockEsClient, 7); // fail findings

    const generalScore = await getAllFindingsStats(mockEsClient, 'randomCycleId');
    expect(generalScore).toEqual({
      name: 'general',
      postureScore: 30,
      totalFailed: 7,
      totalFindings: 10,
      totalPassed: 3,
    });
  });

  it("getAllFindingsStats throws when cycleId doesn't exists", async () => {
    try {
      await getAllFindingsStats(mockEsClient, 'randomCycleId');
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e.message).toEqual('missing stats');
    }
  });
});

describe('get benchmarks list', () => {
  it('getBenchmarks - takes aggregated data and expect unique benchmarks array', async () => {
    const returnedMock = {
      aggregations: {
        benchmarks: {
          buckets: [
            { key: 'CIS Kubernetes', doc_count: 248514 },
            { key: 'GDPR', doc_count: 248514 },
          ],
        },
      },
    };
    mockSearchResultOnce(mockEsClient, returnedMock);
    const benchmarks = await getBenchmarks(mockEsClient);
    expect(benchmarks).toEqual(['CIS Kubernetes', 'GDPR']);
  });
});

describe('score per benchmark, testing getBenchmarksStats', () => {
  it('get data for only one benchmark and check', async () => {
    mockCountResultOnce(mockEsClient, 10); // total findings
    mockCountResultOnce(mockEsClient, 3); // pass findings
    mockCountResultOnce(mockEsClient, 7); // fail findings
    const benchmarkScore = await getBenchmarksStats(mockEsClient, 'randomCycleId', [
      'CIS Benchmark',
    ]);
    expect(benchmarkScore).toEqual([
      {
        name: 'CIS Benchmark',
        postureScore: 30,
        totalFailed: 7,
        totalFindings: 10,
        totalPassed: 3,
      },
    ]);
  });

  it('get data two benchmarks and check', async () => {
    mockCountResultOnce(mockEsClient, 10); // total findings
    mockCountResultOnce(mockEsClient, 3); // pass findings
    mockCountResultOnce(mockEsClient, 7); // fail findings
    mockCountResultOnce(mockEsClient, 100);
    mockCountResultOnce(mockEsClient, 50);
    mockCountResultOnce(mockEsClient, 50);
    const benchmarkScore = await getBenchmarksStats(mockEsClient, 'randomCycleId', [
      'CIS Benchmark',
      'GDPR',
    ]);
    expect(benchmarkScore).toEqual([
      {
        name: 'CIS Benchmark',
        postureScore: 30,
        totalFailed: 7,
        totalFindings: 10,
        totalPassed: 3,
      },
      {
        name: 'GDPR',
        postureScore: 50,
        totalFailed: 50,
        totalFindings: 100,
        totalPassed: 50,
      },
    ]);
  });
});

describe('Evaluation Per Resource', () => {
  it('getResourcesEvaluation - check for one resource', async () => {
    const returnedMock = {
      aggregations: {
        group: {
          buckets: [{ key: 'etcd.yaml', doc_count: 1 }],
        },
      },
    };
    mockSearchResultOnce(mockEsClient, returnedMock);
    mockSearchResultOnce(mockEsClient, returnedMock);
    const evaluations = await getResourcesEvaluation(mockEsClient, 'RandomCycleId');
    expect(evaluations).toEqual([
      { resource: 'etcd.yaml', value: 1, evaluation: 'passed' },
      { resource: 'etcd.yaml', value: 1, evaluation: 'failed' },
    ]);
  });

  it('getResourcesEvaluation - check for multiple resources', async () => {
    const returnedMock1 = {
      aggregations: {
        group: {
          buckets: [
            { key: 'etcd.yaml', doc_count: 2 },
            { key: 'kube-apiserver.yaml', doc_count: 10 },
          ],
        },
      },
    };
    const returnedMock2 = {
      aggregations: {
        group: {
          buckets: [
            { key: 'etcd.yaml', doc_count: 7 },
            { key: 'kube-apiserver.yaml', doc_count: 8 },
          ],
        },
      },
    };
    await mockSearchResultOnce(mockEsClient, returnedMock1);
    await mockSearchResultOnce(mockEsClient, returnedMock2);
    const evaluations = await getResourcesEvaluation(mockEsClient, 'RandomCycleId');
    expect(evaluations).toEqual(
      expect.arrayContaining([
        { resource: 'kube-apiserver.yaml', value: 8, evaluation: 'passed' },
        { resource: 'kube-apiserver.yaml', value: 10, evaluation: 'failed' },
        { resource: 'etcd.yaml', value: 2, evaluation: 'failed' },
        { resource: 'etcd.yaml', value: 7, evaluation: 'passed' },
      ])
    );
  });
});
