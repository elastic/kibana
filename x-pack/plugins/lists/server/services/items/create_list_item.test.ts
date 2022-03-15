/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { elasticsearchClientMock } from 'src/core/server/elasticsearch/client/mocks';

import { getListItemResponseMock } from '../../../common/schemas/response/list_item_schema.mock';
import { LIST_ITEM_ID, LIST_ITEM_INDEX } from '../../../common/constants.mock';
import { getIndexESListItemMock } from '../../schemas/elastic_query/index_es_list_item_schema.mock';

import { CreateListItemOptions, createListItem } from './create_list_item';
import { getCreateListItemOptionsMock } from './create_list_item.mock';

describe('crete_list_item', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a list item as expected with the id changed out for the elastic id', async () => {
    const options = getCreateListItemOptionsMock();
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.index.mockResponse(
      // @ts-expect-error not full response interface
      { _id: 'elastic-id-123' }
    );
    const listItem = await createListItem({ ...options, esClient });
    const expected = getListItemResponseMock();
    expected.id = 'elastic-id-123';
    expect(listItem).toEqual(expected);
  });

  test('It calls "esClient" with body, index, and listIndex', async () => {
    const options = getCreateListItemOptionsMock();
    await createListItem(options);
    const body = getIndexESListItemMock();
    const expected = {
      body,
      id: LIST_ITEM_ID,
      index: LIST_ITEM_INDEX,
      refresh: 'wait_for',
    };
    expect(options.esClient.index).toBeCalledWith(expected);
  });

  test('It returns an auto-generated id if id is sent in undefined', async () => {
    const options = getCreateListItemOptionsMock();
    options.id = undefined;
    const esClient = elasticsearchClientMock.createScopedClusterClient().asCurrentUser;
    esClient.index.mockResponse(
      // @ts-expect-error not full response interface
      { _id: 'elastic-id-123' }
    );
    const list = await createListItem({ ...options, esClient });
    const expected = getListItemResponseMock();
    expected.id = 'elastic-id-123';
    expect(list).toEqual(expected);
  });

  test('It returns null if an item does not match something such as an ip_range with an empty serializer', async () => {
    const options: CreateListItemOptions = {
      ...getCreateListItemOptionsMock(),
      serializer: '',
      type: 'ip_range',
      value: '# some comment',
    };
    const list = await createListItem(options);
    expect(list).toEqual(null);
  });
});
