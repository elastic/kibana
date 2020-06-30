/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { filterEventsAgainstList } from './filter_events_with_list';
import { buildRuleMessageFactory } from './rule_messages';
import { mockLogger, repeatedSearchResultsWithSortId } from './__mocks__/es_results';

import { getExceptionListItemSchemaMock } from '../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { getListItemResponseMock } from '../../../../../lists/common/schemas/response/list_item_schema.mock';
import { listMock } from '../../../../../lists/server/mocks';

const someGuids = Array.from({ length: 13 }).map((x) => uuid.v4());
const buildRuleMessage = buildRuleMessageFactory({
  id: 'fake id',
  ruleId: 'fake rule id',
  index: 'fakeindex',
  name: 'fake name',
});
describe('filterEventsAgainstList', () => {
  let listClient = listMock.getListClient();
  beforeEach(() => {
    jest.clearAllMocks();
    listClient = listMock.getListClient();
    listClient.getListItemByValues = jest.fn().mockResolvedValue([]);
  });

  it('should respond with eventSearchResult if exceptionList is empty array', async () => {
    const res = await filterEventsAgainstList({
      logger: mockLogger,
      listClient,
      exceptionsList: [],
      eventSearchResult: repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3), [
        '1.1.1.1',
        '2.2.2.2',
        '3.3.3.3',
        '7.7.7.7',
      ]),
      buildRuleMessage,
    });
    expect(res.hits.hits.length).toEqual(4);
  });

  describe('operator_type is included', () => {
    it('should respond with same list if no items match value list', async () => {
      const exceptionItem = getExceptionListItemSchemaMock();
      exceptionItem.entries = [
        {
          field: 'source.ip',
          operator: 'included',
          type: 'list',
          list: {
            id: 'ci-badguys.txt',
            type: 'ip',
          },
        },
      ];

      const res = await filterEventsAgainstList({
        logger: mockLogger,
        listClient,
        exceptionsList: [exceptionItem],
        eventSearchResult: repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3)),
        buildRuleMessage,
      });
      expect(res.hits.hits.length).toEqual(4);
    });
    it('should respond with less items in the list if some values match', async () => {
      const exceptionItem = getExceptionListItemSchemaMock();
      exceptionItem.entries = [
        {
          field: 'source.ip',
          operator: 'included',
          type: 'list',
          list: {
            id: 'ci-badguys.txt',
            type: 'ip',
          },
        },
      ];
      listClient.getListItemByValues = jest.fn(({ value }) =>
        Promise.resolve(
          value.slice(0, 2).map((item) => ({
            ...getListItemResponseMock(),
            value: item,
          }))
        )
      );
      const res = await filterEventsAgainstList({
        logger: mockLogger,
        listClient,
        exceptionsList: [exceptionItem],
        eventSearchResult: repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3), [
          '1.1.1.1',
          '2.2.2.2',
          '3.3.3.3',
          '7.7.7.7',
        ]),
        buildRuleMessage,
      });
      expect((listClient.getListItemByValues as jest.Mock).mock.calls[0][0].type).toEqual('ip');
      expect((listClient.getListItemByValues as jest.Mock).mock.calls[0][0].listId).toEqual(
        'ci-badguys.txt'
      );
      expect(res.hits.hits.length).toEqual(2);
    });
  });
  describe('operator type is excluded', () => {
    it('should respond with empty list if no items match value list', async () => {
      const exceptionItem = getExceptionListItemSchemaMock();
      exceptionItem.entries = [
        {
          field: 'source.ip',
          operator: 'excluded',
          type: 'list',
          list: {
            id: 'ci-badguys.txt',
            type: 'ip',
          },
        },
      ];
      const res = await filterEventsAgainstList({
        logger: mockLogger,
        listClient,
        exceptionsList: [exceptionItem],
        eventSearchResult: repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3)),
        buildRuleMessage,
      });
      expect(res.hits.hits.length).toEqual(0);
    });
    it('should respond with less items in the list if some values match', async () => {
      const exceptionItem = getExceptionListItemSchemaMock();
      exceptionItem.entries = [
        {
          field: 'source.ip',
          operator: 'excluded',
          type: 'list',
          list: {
            id: 'ci-badguys.txt',
            type: 'ip',
          },
        },
      ];
      listClient.getListItemByValues = jest.fn(({ value }) =>
        Promise.resolve(
          value.slice(0, 2).map((item) => ({
            ...getListItemResponseMock(),
            value: item,
          }))
        )
      );
      const res = await filterEventsAgainstList({
        logger: mockLogger,
        listClient,
        exceptionsList: [exceptionItem],
        eventSearchResult: repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3), [
          '1.1.1.1',
          '2.2.2.2',
          '3.3.3.3',
          '7.7.7.7',
        ]),
        buildRuleMessage,
      });
      expect((listClient.getListItemByValues as jest.Mock).mock.calls[0][0].type).toEqual('ip');
      expect((listClient.getListItemByValues as jest.Mock).mock.calls[0][0].listId).toEqual(
        'ci-badguys.txt'
      );
      expect(res.hits.hits.length).toEqual(2);
    });
  });
});
