/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { v4 as uuidV4 } from 'uuid';
import { BaseDataGenerator } from '../../../common/endpoint/data_generators/base_data_generator';

interface ApplyEsClientSearchMockOptions<TDocument = unknown> {
  esClientMock: ElasticsearchClientMock;
  index: string;
  response: SearchResponse<TDocument>;
  /**
   * Mock is to be used only when search is using ES's Point-in-Time
   */
  pitUsage?: boolean;
}

/**
 * Generic utility for applying mocks to ES Client mock search method. Any existing mock implementation
 * for the `.search()` method will be called if the mock being applied does not match the target
 * index, thus this utility can be chained on top of other already applied mock implementations.
 *
 * This utility also handles search requests using Point In Time.
 */
export const applyEsClientSearchMock = <TDocument = unknown>({
  esClientMock,
  index,
  response,
  pitUsage,
}: ApplyEsClientSearchMockOptions<TDocument>) => {
  const priorSearchMockImplementation = esClientMock.search.getMockImplementation();
  const priorOpenPointInTimeImplementation = esClientMock.openPointInTime.getMockImplementation();
  const priorClosePointInTimeImplementation = esClientMock.closePointInTime.getMockImplementation();
  const openedPitIds = new Set<string>();

  esClientMock.openPointInTime.mockImplementation(async (...args) => {
    const options = args[0];

    if (options.index === index) {
      const pitResponse = { id: `mock:pit:${index}:${uuidV4()}` };
      openedPitIds.add(pitResponse.id);

      return pitResponse;
    }

    if (priorOpenPointInTimeImplementation) {
      return priorOpenPointInTimeImplementation(...args);
    }

    return { id: 'mock' };
  });

  esClientMock.closePointInTime.mockImplementation(async (...args) => {
    const closePitResponse = { succeeded: true, num_freed: 1 };
    const options = args[0];
    const pitId = 'id' in options ? options.id : 'body' in options ? options.body?.id : undefined;

    if (pitId) {
      if (openedPitIds.has(pitId)) {
        openedPitIds.delete(pitId);
        return closePitResponse;
      }
    }

    if (priorClosePointInTimeImplementation) {
      return priorClosePointInTimeImplementation(options);
    }

    return closePitResponse;
  });

  esClientMock.search.mockImplementation(async (...args) => {
    const params = args[0] ?? {};
    const searchReqIndexes = Array.isArray(params.index) ? params.index : [params.index];
    const pit = 'pit' in params ? params.pit : undefined;

    if (params.index && !pitUsage && searchReqIndexes.includes(index)) {
      return response;
    } else if (pit && pitUsage && openedPitIds.has(pit.id)) {
      return response;
    }

    if (priorSearchMockImplementation) {
      return priorSearchMockImplementation(...args);
    }

    return BaseDataGenerator.toEsSearchResponse([]);
  });
};
