/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IndexEsListItemSchema } from '../../../common/schemas';
import {
  LIST_ITEM_INDEX,
  TIE_BREAKERS,
  VALUE_2,
  getCreateListItemBulkOptionsMock,
  getIndexESListItemMock,
} from '../mocks';

import { createListItemsBulk } from './create_list_items_bulk';

describe('crete_list_item_bulk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('It calls "callAsCurrentUser" with body, index, and the bulk items', async () => {
    const options = getCreateListItemBulkOptionsMock();
    await createListItemsBulk(options);
    const firstRecord: IndexEsListItemSchema = getIndexESListItemMock();
    firstRecord.tie_breaker_id = TIE_BREAKERS[0];
    const secondRecord: IndexEsListItemSchema = getIndexESListItemMock(VALUE_2);
    secondRecord.tie_breaker_id = TIE_BREAKERS[1];
    expect(options.dataClient.callAsCurrentUser).toBeCalledWith('bulk', {
      body: [
        { create: { _index: LIST_ITEM_INDEX } },
        firstRecord,
        { create: { _index: LIST_ITEM_INDEX } },
        secondRecord,
      ],
      index: LIST_ITEM_INDEX,
    });
  });

  test('It should not call the dataClient when the values are empty', async () => {
    const options = getCreateListItemBulkOptionsMock();
    options.value = [];
    expect(options.dataClient.callAsCurrentUser).not.toBeCalled();
  });
});
