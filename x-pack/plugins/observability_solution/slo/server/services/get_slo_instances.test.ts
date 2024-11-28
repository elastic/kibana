/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClientMock, elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { ALL_VALUE } from '@kbn/slo-schema';
import { GetSLOInstances, SLORepository } from '.';
import { createSLO } from './fixtures/slo';
import { createSLORepositoryMock } from './mocks';

describe('Get SLO Instances', () => {
  let repositoryMock: jest.Mocked<SLORepository>;
  let esClientMock: ElasticsearchClientMock;

  beforeEach(() => {
    repositoryMock = createSLORepositoryMock();
    esClientMock = elasticsearchServiceMock.createElasticsearchClient();
  });

  it("returns an empty results when the SLO has no 'groupBy' defined", async () => {
    const slo = createSLO({ groupBy: ALL_VALUE });
    repositoryMock.findById.mockResolvedValue(slo);

    const service = new GetSLOInstances(repositoryMock, esClientMock);

    const result = await service.execute(slo.id, {});

    expect(result).toEqual({ results: [] });
  });

  it('returns an empty results when the groupingKey specified is not in the SLO groupBy', async () => {
    const slo = createSLO({ groupBy: ['service.name'] });
    repositoryMock.findById.mockResolvedValue(slo);

    const service = new GetSLOInstances(repositoryMock, esClientMock);

    const result = await service.execute(slo.id, { groupingKey: 'transaction.name' });

    expect(result).toEqual({ results: [] });
  });
});
