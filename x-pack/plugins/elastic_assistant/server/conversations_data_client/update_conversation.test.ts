/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import type { ListSchema } from '@kbn/securitysolution-io-ts-list-types';
import { updateConversation } from './update_conversation';

jest.mock('./get_conversation', () => ({
  getList: jest.fn(),
}));

describe('updateConversation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a list with serializer and deserializer', async () => {
    const list: ListSchema = {
      ...getListResponseMock(),
      deserializer: '{{value}}',
      serializer: '(?<value>)',
    };
    (getList as unknown as jest.Mock).mockResolvedValueOnce(list);
    const options = getupdateConversationOptionsMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.updateByQuery.mockResolvedValue({ updated: 1 });
    const updatedList = await updateConversation({ ...options, esClient });
    const expected: ListSchema = {
      ...getListResponseMock(),
      deserializer: '{{value}}',
      id: list.id,
      serializer: '(?<value>)',
    };
    expect(updatedList).toEqual(expected);
  });

  test('it returns null when there is not a list to update', async () => {
    (getList as unknown as jest.Mock).mockResolvedValueOnce(null);
    const options = getupdateConversationOptionsMock();
    const updatedList = await updateConversation(options);
    expect(updatedList).toEqual(null);
  });

  test('throw error if no list was updated', async () => {
    const list: ListSchema = {
      ...getListResponseMock(),
      deserializer: '{{value}}',
      serializer: '(?<value>)',
    };
    (getList as unknown as jest.Mock).mockResolvedValueOnce(list);
    const options = getupdateConversationOptionsMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.updateByQuery.mockResolvedValue({ updated: 0 });
    await expect(updateConversation({ ...options, esClient })).rejects.toThrow('No list has been updated');
  });
});
