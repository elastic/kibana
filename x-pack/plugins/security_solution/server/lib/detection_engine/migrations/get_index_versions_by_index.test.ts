/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { getIndexVersionsByIndex } from './get_index_versions_by_index';

describe('getIndexVersionsByIndex', () => {
  let esClient: ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

  beforeEach(() => {
    esClient = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('returns keys for each specified index', async () => {
    esClient.indices.getMapping.mockResponse({});

    const result = await getIndexVersionsByIndex({
      esClient,
      index: ['index1', 'index2'],
    });

    expect(Object.keys(result)).toEqual(['index1', 'index2']);
  });

  it('returns undefined values if no mappings are found', async () => {
    esClient.indices.getMapping.mockResponse({});

    const result = await getIndexVersionsByIndex({
      esClient,
      index: ['index1', 'index2'],
    });

    expect(result).toEqual({
      index1: undefined,
      index2: undefined,
    });
  });

  it('properly transforms the response', async () => {
    esClient.indices.getMapping.mockResponse({
      index1: { mappings: { _meta: { version: 3 } } },
    });

    const result = await getIndexVersionsByIndex({
      esClient,
      index: ['index1', 'index2'],
    });

    expect(result).toEqual({
      index1: 3,
      index2: undefined,
    });
  });
});
