/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

import { getFoundListItemSchemaMock } from '../../../common/schemas/response/found_list_item_schema.mock';
import { getEmptySearchListMock } from '../../../common/schemas/elastic_response/search_es_list_schema.mock';

import { getFindListItemOptionsMock } from './find_list_item.mock';
import { findListItem } from './find_list_item';

describe('find_list_item', () => {
  test('should find a simple single list item', async () => {
    const options = getFindListItemOptionsMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise({
        hits: {
          hits: {
            _id: 'some-list-item-id',
            _source: {
              _version: 'undefined',
              created_at: '2020-04-20T15:25:31.830Z',
              created_by: 'some user',
              deserializer: 'undefined',
              list_id: 'some-list-id',
              meta: {},
              serializer: 'undefined',
              tie_breaker_id: '6a76b69d-80df-4ab2-8c3e-85f466b06a0e',
              type: 'ip',
              updated_at: '2020-04-20T15:25:31.830Z',
              updated_by: 'some user',
            },
          },
        },
      })
    );
    const item = await findListItem({ ...options, esClient });
    const expected = getFoundListItemSchemaMock();
    expect(item).toEqual(expected);
  });

  test('should return null if the list is null', async () => {
    const options = getFindListItemOptionsMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(getEmptySearchListMock())
    );
    const item = await findListItem({ ...options, esClient });
    expect(item).toEqual(null);
  });
});
