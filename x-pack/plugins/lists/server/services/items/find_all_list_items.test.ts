/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';

import { getFoundAllListItemsSchemaMock } from '../../../common/schemas/response/found_all_list_items_schema.mock';
import { getShardMock } from '../../schemas/common/get_shard.mock';
import { getEmptySearchListMock } from '../../schemas/elastic_response/search_es_list_schema.mock';

import { getFindAllListItemsOptionsMock } from './find_all_list_items.mock';
import { findAllListItems } from './find_all_list_items';

describe('find_all_list_items', () => {
  test('should return all list items for a list', async () => {
    const options = getFindAllListItemsOptionsMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.count.mockResponse(
      // @ts-expect-error not full response interface
      { count: 1 }
    );
    esClient.search.mockResponse({
      _scroll_id: '123',
      _shards: getShardMock(),
      hits: {
        hits: [
          // @ts-expect-error not full response interface
          {
            _id: 'some-list-item-id',
            _source: {
              _version: 'undefined',
              created_at: '2020-04-20T15:25:31.830Z',
              created_by: 'some user',
              date_range: '127.0.0.1',
              deserializer: undefined,
              list_id: 'some-list-id',
              meta: {},
              serializer: undefined,
              tie_breaker_id: '6a76b69d-80df-4ab2-8c3e-85f466b06a0e',
              type: 'ip',
              updated_at: '2020-04-20T15:25:31.830Z',
              updated_by: 'some user',
            },
          },
        ],
        max_score: 0,
        total: 1,
      },
      timed_out: false,
      took: 10,
    });
    const item = await findAllListItems({ ...options, esClient });
    const expected = getFoundAllListItemsSchemaMock();
    expect(item).toEqual(expected);
  });

  test('should return null if the list is null', async () => {
    const options = getFindAllListItemsOptionsMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockResponse(getEmptySearchListMock());
    const item = await findAllListItems({ ...options, esClient });
    expect(item).toEqual(null);
  });
});
