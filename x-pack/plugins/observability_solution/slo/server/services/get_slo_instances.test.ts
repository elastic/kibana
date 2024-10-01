/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSLO } from './fixtures/slo';
import { GetSLOInstances } from '.';
import { createSloContextMock, SLOContextMock } from './mocks';
import { ALL_VALUE } from '@kbn/slo-schema';

describe('Get SLO Instances', () => {
  let contextMock: jest.Mocked<SLOContextMock>;

  beforeEach(() => {
    contextMock = createSloContextMock();
  });

  it("returns an empty response when the SLO has no 'groupBy' defined", async () => {
    const slo = createSLO({ groupBy: ALL_VALUE });
    contextMock.repository.findById.mockResolvedValue(slo);

    const service = new GetSLOInstances(contextMock);

    const result = await service.execute(slo.id);

    expect(result).toEqual({ groupBy: ALL_VALUE, instances: [] });
  });

  it("returns all instances of a SLO defined with a 'groupBy'", async () => {
    const slo = createSLO({ id: 'slo-id', revision: 2, groupBy: 'field.to.host' });
    contextMock.repository.findById.mockResolvedValue(slo);
    contextMock.esClient.search.mockResolvedValue({
      took: 100,
      timed_out: false,
      _shards: {
        total: 0,
        successful: 0,
        skipped: 0,
        failed: 0,
      },
      hits: {
        hits: [],
      },
      aggregations: {
        instances: {
          buckets: [
            { key: 'host-aaa', doc_value: 100 },
            { key: 'host-bbb', doc_value: 200 },
            { key: 'host-ccc', doc_value: 500 },
          ],
        },
      },
    });

    const service = new GetSLOInstances(contextMock);

    const result = await service.execute(slo.id);

    expect(result).toEqual({
      groupBy: 'field.to.host',
      instances: ['host-aaa', 'host-bbb', 'host-ccc'],
    });
    expect(contextMock.esClient.search.mock.calls[0]).toMatchSnapshot();
  });
});
