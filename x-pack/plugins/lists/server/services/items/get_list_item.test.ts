/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSearchListItemMock } from '../../../common/schemas/elastic_response/search_es_list_item_schema.mock';
import { getListItemResponseMock } from '../../../common/schemas/response/list_item_schema.mock';
import { getCallClusterMock } from '../../../common/get_call_cluster.mock';
import { LIST_ID, LIST_INDEX } from '../../../common/constants.mock';

import { getListItem } from './get_list_item';

describe('get_list_item', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns a list item as expected if the list item is found', async () => {
    const data = getSearchListItemMock();
    const callCluster = getCallClusterMock(data);
    const list = await getListItem({ callCluster, id: LIST_ID, listItemIndex: LIST_INDEX });
    const expected = getListItemResponseMock();
    expect(list).toEqual(expected);
  });

  test('it returns null if the search is empty', async () => {
    const data = getSearchListItemMock();
    data.hits.hits = [];
    const callCluster = getCallClusterMock(data);
    const list = await getListItem({ callCluster, id: LIST_ID, listItemIndex: LIST_INDEX });
    expect(list).toEqual(null);
  });
});
