/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getIndexESListItemMock } from '../../../common/schemas/elastic_query/index_es_list_item_schema.mock';
import { LIST_ITEM_INDEX, TIE_BREAKERS, VALUE_2 } from '../../../common/constants.mock';

import { CreateListItemsBulkOptions, createListItemsBulk } from './create_list_items_bulk';
import { getCreateListItemBulkOptionsMock } from './create_list_items_bulk.mock';

describe('crete_list_item_bulk', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('It calls "callCluster" with body, index, and the bulk items', async () => {
    const options = getCreateListItemBulkOptionsMock();
    await createListItemsBulk(options);
    const firstRecord = getIndexESListItemMock();
    const secondRecord = getIndexESListItemMock(VALUE_2);
    [firstRecord.tie_breaker_id, secondRecord.tie_breaker_id] = TIE_BREAKERS;
    expect(options.callCluster).toBeCalledWith('bulk', {
      body: [
        { create: { _index: LIST_ITEM_INDEX } },
        firstRecord,
        { create: { _index: LIST_ITEM_INDEX } },
        secondRecord,
      ],
      index: LIST_ITEM_INDEX,
      refresh: 'wait_for',
    });
  });

  test('It should not call the dataClient when the values are empty', async () => {
    const options = getCreateListItemBulkOptionsMock();
    options.value = [];
    expect(options.callCluster).not.toBeCalled();
  });

  test('It should skip over a value if it is not able to add that item because it is not parsable such as an ip_range with a serializer that only matches one ip', async () => {
    const options: CreateListItemsBulkOptions = {
      ...getCreateListItemBulkOptionsMock(),
      serializer: '(?<value>127.0.0.1)', // this will create a regular expression which will only match 127.0.0.1 and not 127.0.0.1
      type: 'ip_range',
      value: ['127.0.0.1', '127.0.0.2'],
    };
    await createListItemsBulk(options);
    expect(options.callCluster).toBeCalledWith('bulk', {
      body: [
        { create: { _index: LIST_ITEM_INDEX } },
        {
          created_at: '2020-04-20T15:25:31.830Z',
          created_by: 'some user',
          deserializer: undefined,
          ip_range: {
            gte: '127.0.0.1',
            lte: '127.0.0.1',
          },
          list_id: 'some-list-id',
          meta: {},
          serializer: '(?<value>127.0.0.1)',
          tie_breaker_id: TIE_BREAKERS[0],
          updated_at: '2020-04-20T15:25:31.830Z',
          updated_by: 'some user',
        },
      ],
      index: '.items',
      refresh: 'wait_for',
    });
  });
});
