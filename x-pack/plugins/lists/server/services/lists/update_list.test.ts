/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';
import type { ListSchema } from '@kbn/securitysolution-io-ts-list-types';

import { getListResponseMock } from '../../../common/schemas/response/list_schema.mock';

import { updateList } from './update_list';
import { getList } from './get_list';
import { getUpdateListOptionsMock } from './update_list.mock';

jest.mock('./get_list', () => ({
  getList: jest.fn(),
}));

describe('update_list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a list as expected with the id changed out for the elastic id when there is a list to update', async () => {
    const list = getListResponseMock();
    (getList as unknown as jest.Mock).mockResolvedValueOnce(list);
    const options = getUpdateListOptionsMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.update.mockResponse(
      // @ts-expect-error not full response interface
      { _id: 'elastic-id-123' }
    );
    const updatedList = await updateList({ ...options, esClient });
    const expected: ListSchema = { ...getListResponseMock(), id: 'elastic-id-123' };
    expect(updatedList).toEqual(expected);
  });

  test('it returns a list with serializer and deserializer', async () => {
    const list: ListSchema = {
      ...getListResponseMock(),
      deserializer: '{{value}}',
      serializer: '(?<value>)',
    };
    (getList as unknown as jest.Mock).mockResolvedValueOnce(list);
    const options = getUpdateListOptionsMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.update.mockResponse(
      // @ts-expect-error not full response interface
      { _id: 'elastic-id-123' }
    );
    const updatedList = await updateList({ ...options, esClient });
    const expected: ListSchema = {
      ...getListResponseMock(),
      deserializer: '{{value}}',
      id: 'elastic-id-123',
      serializer: '(?<value>)',
    };
    expect(updatedList).toEqual(expected);
  });

  test('it returns null when there is not a list to update', async () => {
    (getList as unknown as jest.Mock).mockResolvedValueOnce(null);
    const options = getUpdateListOptionsMock();
    const updatedList = await updateList(options);
    expect(updatedList).toEqual(null);
  });
});
