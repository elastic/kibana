/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getEmptySearchListMock } from '../../../common/schemas/elastic_response/search_es_list_schema.mock';
import { getCallClusterMockMultiTimes } from '../../../common/get_call_cluster.mock';
import { getFoundListItemSchemaMock } from '../../../common/schemas/response/found_list_item_schema.mock';

import { getFindListItemOptionsMock } from './find_list_item.mock';
import { findListItem } from './find_list_item';

describe('find_list_item', () => {
  test('should find a simple single list item', async () => {
    const options = getFindListItemOptionsMock();
    const item = await findListItem(options);
    const expected = getFoundListItemSchemaMock();
    expect(item).toEqual(expected);
  });

  test('should return null if the list is null', async () => {
    const options = getFindListItemOptionsMock();
    options.callCluster = getCallClusterMockMultiTimes([getEmptySearchListMock()]);
    const item = await findListItem(options);
    expect(item).toEqual(null);
  });
});
