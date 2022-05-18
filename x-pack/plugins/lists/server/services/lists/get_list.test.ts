/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from '@kbn/core/server/elasticsearch/client/mocks';

import { getListResponseMock } from '../../../common/schemas/response/list_schema.mock';
import { LIST_ID, LIST_INDEX } from '../../../common/constants.mock';
import { getSearchListMock } from '../../schemas/elastic_response/search_es_list_schema.mock';

import { getList } from './get_list';

describe('get_list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a list as expected if the list is found', async () => {
    const data = getSearchListMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockResponse(data);
    const list = await getList({ esClient, id: LIST_ID, listIndex: LIST_INDEX });
    const expected = getListResponseMock();
    expect(list).toEqual(expected);
  });

  test('it returns null if the search is empty', async () => {
    const data = getSearchListMock();
    data.hits.hits = [];
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockResponse(data);
    const list = await getList({ esClient, id: LIST_ID, listIndex: LIST_INDEX });
    expect(list).toEqual(null);
  });
});
