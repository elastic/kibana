/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

import { getListItemResponseMock } from '../../../common/schemas/response/list_item_schema.mock';
import { getFoundListItemSchemaMock } from '../../../common/schemas/response/found_list_item_schema.mock';
import { getEmptySearchListMock } from '../../../common/schemas/elastic_response/search_es_list_schema.mock';

import { getFindListItemOptionsMock } from './find_list_item.mock';
import { findListItem } from './find_list_item';

describe('find_list_item', () => {
  test('should find a simple single list item', async () => {
    const options = getFindListItemOptionsMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockReturnValue(
      elasticsearchClientMock.createSuccessTransportRequestPromise(getListItemResponseMock())
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
