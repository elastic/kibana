/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockLogger, sampleDocWithSortId } from '../__mocks__/es_results';

import { listMock } from '@kbn/lists-plugin/server/mocks';
import { getSearchListItemResponseMock } from '@kbn/lists-plugin/common/schemas/response/search_list_item_schema.mock';
import { createSetToFilterAgainst } from './create_set_to_filter_against';
import { buildRuleMessageMock as buildRuleMessage } from '../rule_messages.mock';

describe('createSetToFilterAgainst', () => {
  let listClient = listMock.getListClient();
  let events = [sampleDocWithSortId('123', undefined, '1.1.1.1')];

  beforeEach(() => {
    jest.clearAllMocks();
    listClient = listMock.getListClient();
    listClient.searchListItemByValues = jest.fn(({ value }) =>
      Promise.resolve(
        value.map((item) => ({
          ...getSearchListItemResponseMock(),
          value: item,
        }))
      )
    );
    events = [sampleDocWithSortId('123', undefined, '1.1.1.1')];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it returns an empty array if list return is empty', async () => {
    listClient.searchListItemByValues = jest.fn().mockResolvedValue([]);
    const field = await createSetToFilterAgainst({
      events,
      field: 'source.ip',
      listId: 'list-123',
      listType: 'ip',
      listClient,
      logger: mockLogger,
      buildRuleMessage,
    });
    expect([...field]).toEqual([]);
  });

  test('it returns 1 field if the list returns a single item', async () => {
    events = [sampleDocWithSortId('123', undefined, '1.1.1.1')];
    const field = await createSetToFilterAgainst({
      events,
      field: 'source.ip',
      listId: 'list-123',
      listType: 'ip',
      listClient,
      logger: mockLogger,
      buildRuleMessage,
    });
    expect(listClient.searchListItemByValues).toHaveBeenCalledWith({
      listId: 'list-123',
      type: 'ip',
      value: [['1.1.1.1']],
    });
    expect([...field]).toEqual([JSON.stringify(['1.1.1.1'])]);
  });

  test('it returns 2 fields if the list returns 2 items', async () => {
    events = [
      sampleDocWithSortId('123', undefined, '1.1.1.1'),
      sampleDocWithSortId('123', undefined, '2.2.2.2'),
    ];
    const field = await createSetToFilterAgainst({
      events,
      field: 'source.ip',
      listId: 'list-123',
      listType: 'ip',
      listClient,
      logger: mockLogger,
      buildRuleMessage,
    });
    expect(listClient.searchListItemByValues).toHaveBeenCalledWith({
      listId: 'list-123',
      type: 'ip',
      value: [['1.1.1.1'], ['2.2.2.2']],
    });
    expect([...field]).toEqual([JSON.stringify(['1.1.1.1']), JSON.stringify(['2.2.2.2'])]);
  });

  test('it returns 0 fields if the field does not match up to a valid field within the event', async () => {
    events = [
      sampleDocWithSortId('123', undefined, '1.1.1.1'),
      sampleDocWithSortId('123', undefined, '2.2.2.2'),
    ];
    const field = await createSetToFilterAgainst({
      events,
      field: 'nonexistent.field', // field does not exist
      listId: 'list-123',
      listType: 'ip',
      listClient,
      logger: mockLogger,
      buildRuleMessage,
    });
    expect(listClient.searchListItemByValues).toHaveBeenCalledWith({
      listId: 'list-123',
      type: 'ip',
      value: [],
    });
    expect([...field]).toEqual([]);
  });
});
