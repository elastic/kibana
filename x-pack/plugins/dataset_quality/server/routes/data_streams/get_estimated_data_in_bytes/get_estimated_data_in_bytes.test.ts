/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { indexStatsService } from '../../../services';

import { getEstimatedDataInBytes } from '.';

jest.mock('../../../services/index_stats', () => {
  return {
    indexStatsService: {
      getIndexStats: jest.fn().mockImplementation(() => {
        return {
          doc_count: 120,
          size_in_bytes: 1230412,
        };
      }),
      getIndexDocCount: jest.fn().mockImplementation(() => {
        return 60;
      }),
    },
  };
});

describe('getDataStreams', () => {
  it('Passes the correct parameters to the IndexStatsService', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    await getEstimatedDataInBytes({
      esClient: esClientMock,
      type: 'logs',
    });
    expect(indexStatsService.getIndexStats).toHaveBeenCalledWith(expect.anything(), 'logs');
    expect(indexStatsService.getIndexDocCount).toHaveBeenCalledWith(
      expect.anything(),
      'logs',
      undefined,
      undefined
    );
  });

  it('Calculates the average doc size correctly', async () => {
    const esClientMock = elasticsearchServiceMock.createElasticsearchClient();
    const result = await getEstimatedDataInBytes({
      esClient: esClientMock,
      type: 'logs',
    });
    expect(result).toEqual(615206);
  });
});
