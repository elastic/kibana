/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { getConversation } from './get_conversation';

describe('getConversation', () => {
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
    const conversation = await getConversation(esClient, LIST_INDEX, id );
    const expected = getListResponseMock();
    expect(conversation).toEqual(expected);
  });

  test('it returns null if the search is empty', async () => {
    const data = getSearchListMock();
    data.hits.hits = [];
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.search.mockResponse(data);
    const conversation = await getConversation(esClient, LIST_INDEX, id);
    expect(conversation).toEqual(null);
  });
});
