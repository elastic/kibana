/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { filterEventsAgainstList } from './filter_events_against_list';
import { buildRuleMessageMock as buildRuleMessage } from '../rule_messages.mock';
import { mockLogger, repeatedHitsWithSortId } from '../__mocks__/es_results';

import { getExceptionListItemSchemaMock } from '../../../../../../lists/common/schemas/response/exception_list_item_schema.mock';
import { listMock } from '../../../../../../lists/server/mocks';
import { getSearchListItemResponseMock } from '../../../../../../lists/common/schemas/response/search_list_item_schema.mock';

const someGuids = Array.from({ length: 13 }).map((x) => uuid.v4());

describe('filterEventsAgainstList', () => {
  let listClient = listMock.getListClient();

  beforeEach(() => {
    jest.clearAllMocks();
    listClient = listMock.getListClient();
    listClient.searchListItemByValues = jest.fn().mockResolvedValue([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should respond with eventSearchResult if exceptionList is empty array', async () => {
    const [included, excluded] = await filterEventsAgainstList({
      logger: mockLogger,
      listClient,
      exceptionsList: [],
      events: repeatedHitsWithSortId(4, someGuids.slice(0, 3), [
        '1.1.1.1',
        '2.2.2.2',
        '3.3.3.3',
        '7.7.7.7',
      ]),
      buildRuleMessage,
    });
    expect(included.length).toEqual(4);
    expect(excluded.length).toEqual(0);
  });

  it('should respond with eventSearchResult if exceptionList does not contain value list exceptions', async () => {
    const [included, excluded] = await filterEventsAgainstList({
      logger: mockLogger,
      listClient,
      exceptionsList: [getExceptionListItemSchemaMock()],
      events: repeatedHitsWithSortId(4, someGuids.slice(0, 3), [
        '1.1.1.1',
        '2.2.2.2',
        '3.3.3.3',
        '7.7.7.7',
      ]),
      buildRuleMessage,
    });
    expect(included.length).toEqual(4);
    expect(excluded.length).toEqual(0);
    expect((mockLogger.debug as unknown as jest.Mock).mock.calls[0][0]).toContain(
      'no exception items of type list found - returning original search result'
    );
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

      const [included, excluded] = await filterEventsAgainstList({
        logger: mockLogger,
        listClient,
        exceptionsList: [exceptionItem],
        events: repeatedHitsWithSortId(4, someGuids.slice(0, 3)),
        buildRuleMessage,
      });
      expect(included.length).toEqual(4);
      expect(excluded.length).toEqual(0);
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
      listClient.searchListItemByValues = jest.fn(({ value }) =>
        Promise.resolve(
          value.slice(0, 2).map((item) => ({
            ...getSearchListItemResponseMock(),
            value: item,
          }))
        )
      );
      const [included, excluded] = await filterEventsAgainstList({
        logger: mockLogger,
        listClient,
        exceptionsList: [exceptionItem],
        events: repeatedHitsWithSortId(4, someGuids.slice(0, 3), [
          '1.1.1.1',
          '2.2.2.2',
          '3.3.3.3',
          '7.7.7.7',
        ]),
        buildRuleMessage,
      });
      expect((listClient.searchListItemByValues as jest.Mock).mock.calls[0][0].type).toEqual('ip');
      expect((listClient.searchListItemByValues as jest.Mock).mock.calls[0][0].listId).toEqual(
        'ci-badguys.txt'
      );
      expect(included.length).toEqual(2);
      expect(excluded.length).toEqual(2);

      // @ts-expect-error
      const ipVals = included.map((item) => item._source.source.ip);
      expect(['3.3.3.3', '7.7.7.7']).toEqual(ipVals);
    });

    it('should respond with less items in the list given two exception items with entries of type list if some values match', async () => {
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

      const exceptionItemAgain = getExceptionListItemSchemaMock();
      exceptionItemAgain.entries = [
        {
          field: 'source.ip',
          operator: 'included',
          type: 'list',
          list: {
            id: 'ci-badguys-again.txt',
            type: 'ip',
          },
        },
      ];

      // this call represents an exception list with a value list containing ['2.2.2.2', '4.4.4.4']
      (listClient.searchListItemByValues as jest.Mock).mockResolvedValueOnce([
        { ...getSearchListItemResponseMock(), value: ['2.2.2.2'] },
        { ...getSearchListItemResponseMock(), value: ['4.4.4.4'] },
      ]);
      // this call represents an exception list with a value list containing ['6.6.6.6']
      (listClient.searchListItemByValues as jest.Mock).mockResolvedValueOnce([
        { ...getSearchListItemResponseMock(), value: ['6.6.6.6'] },
      ]);

      const [included, excluded] = await filterEventsAgainstList({
        logger: mockLogger,
        listClient,
        exceptionsList: [exceptionItem, exceptionItemAgain],
        events: repeatedHitsWithSortId(9, someGuids.slice(0, 9), [
          '1.1.1.1',
          '2.2.2.2',
          '3.3.3.3',
          '4.4.4.4',
          '5.5.5.5',
          '6.6.6.6',
          '7.7.7.7',
          '8.8.8.8',
          '9.9.9.9',
        ]),
        buildRuleMessage,
      });
      expect(listClient.searchListItemByValues as jest.Mock).toHaveBeenCalledTimes(2);
      expect(included.length).toEqual(6);
      expect(excluded.length).toEqual(3);

      // @ts-expect-error
      const ipVals = included.map((item) => item._source.source.ip);
      expect(['1.1.1.1', '3.3.3.3', '5.5.5.5', '7.7.7.7', '8.8.8.8', '9.9.9.9']).toEqual(ipVals);
    });

    it('should respond with less items in the list given two exception items, each with one entry of type list if some values match', async () => {
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

      const exceptionItemAgain = getExceptionListItemSchemaMock();
      exceptionItemAgain.entries = [
        {
          field: 'source.ip',
          operator: 'included',
          type: 'list',
          list: {
            id: 'ci-badguys-again.txt',
            type: 'ip',
          },
        },
      ];

      // this call represents an exception list with a value list containing ['2.2.2.2', '4.4.4.4']
      (listClient.searchListItemByValues as jest.Mock).mockResolvedValueOnce([
        { ...getSearchListItemResponseMock(), value: ['2.2.2.2'] },
      ]);
      // this call represents an exception list with a value list containing ['6.6.6.6']
      (listClient.searchListItemByValues as jest.Mock).mockResolvedValueOnce([
        { ...getSearchListItemResponseMock(), value: ['6.6.6.6'] },
      ]);

      const [included, excluded] = await filterEventsAgainstList({
        logger: mockLogger,
        listClient,
        exceptionsList: [exceptionItem, exceptionItemAgain],
        events: repeatedHitsWithSortId(9, someGuids.slice(0, 9), [
          '1.1.1.1',
          '2.2.2.2',
          '3.3.3.3',
          '4.4.4.4',
          '5.5.5.5',
          '6.6.6.6',
          '7.7.7.7',
          '8.8.8.8',
          '9.9.9.9',
        ]),
        buildRuleMessage,
      });
      expect(listClient.searchListItemByValues as jest.Mock).toHaveBeenCalledTimes(2);
      // @ts-expect-error
      const ipVals = included.map((item) => item._source.source.ip);
      expect(included.length).toEqual(7);
      expect(excluded.length).toEqual(2);

      expect(['1.1.1.1', '3.3.3.3', '4.4.4.4', '5.5.5.5', '7.7.7.7', '8.8.8.8', '9.9.9.9']).toEqual(
        ipVals
      );
    });

    it('should respond with less items in the list given one exception item with two entries of type list only if source.ip and destination.ip are in the events', async () => {
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
        {
          field: 'destination.ip',
          operator: 'included',
          type: 'list',
          list: {
            id: 'ci-badguys-again.txt',
            type: 'ip',
          },
        },
      ];

      // this call represents an exception list with a value list containing ['2.2.2.2']
      (listClient.searchListItemByValues as jest.Mock).mockResolvedValueOnce([
        { ...getSearchListItemResponseMock(), value: ['2.2.2.2'] },
      ]);
      // this call represents an exception list with a value list containing ['4.4.4.4']
      (listClient.searchListItemByValues as jest.Mock).mockResolvedValueOnce([
        { ...getSearchListItemResponseMock(), value: ['4.4.4.4'] },
      ]);

      const [included, excluded] = await filterEventsAgainstList({
        logger: mockLogger,
        listClient,
        exceptionsList: [exceptionItem],
        events: repeatedHitsWithSortId(
          9,
          someGuids.slice(0, 9),
          [
            '1.1.1.1',
            '2.2.2.2',
            '3.3.3.3',
            '4.4.4.4',
            '5.5.5.5',
            '6.6.6.6',
            '2.2.2.2',
            '8.8.8.8',
            '9.9.9.9',
          ],
          [
            '2.2.2.2',
            '2.2.2.2',
            '2.2.2.2',
            '2.2.2.2',
            '2.2.2.2',
            '2.2.2.2',
            '4.4.4.4',
            '2.2.2.2',
            '2.2.2.2',
          ]
        ),
        buildRuleMessage,
      });
      expect(listClient.searchListItemByValues as jest.Mock).toHaveBeenCalledTimes(2);
      expect(included.length).toEqual(8);
      expect(excluded.length).toEqual(1);

      // @ts-expect-error
      const ipVals = included.map((item) => item._source?.source?.ip);
      expect([
        '1.1.1.1',
        '2.2.2.2',
        '3.3.3.3',
        '4.4.4.4',
        '5.5.5.5',
        '6.6.6.6',
        '8.8.8.8',
        '9.9.9.9',
      ]).toEqual(ipVals);
    });

    it('should respond with the same items in the list given one exception item with two entries of type list where the entries are included and excluded', async () => {
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
        {
          field: 'source.ip',
          operator: 'excluded',
          type: 'list',
          list: {
            id: 'ci-badguys-again.txt',
            type: 'ip',
          },
        },
      ];

      // this call represents an exception list with a value list containing ['2.2.2.2', '4.4.4.4']
      (listClient.searchListItemByValues as jest.Mock).mockResolvedValue([
        { ...getSearchListItemResponseMock(), value: ['2.2.2.2'] },
      ]);

      const [included, excluded] = await filterEventsAgainstList({
        logger: mockLogger,
        listClient,
        exceptionsList: [exceptionItem],
        events: repeatedHitsWithSortId(9, someGuids.slice(0, 9), [
          '1.1.1.1',
          '2.2.2.2',
          '3.3.3.3',
          '4.4.4.4',
          '5.5.5.5',
          '6.6.6.6',
          '7.7.7.7',
          '8.8.8.8',
          '9.9.9.9',
        ]),
        buildRuleMessage,
      });
      expect(listClient.searchListItemByValues as jest.Mock).toHaveBeenCalledTimes(2);
      expect(included.length).toEqual(9);
      expect(excluded.length).toEqual(0);

      // @ts-expect-error
      const ipVals = included.map((item) => item._source.source.ip);
      expect([
        '1.1.1.1',
        '2.2.2.2',
        '3.3.3.3',
        '4.4.4.4',
        '5.5.5.5',
        '6.6.6.6',
        '7.7.7.7',
        '8.8.8.8',
        '9.9.9.9',
      ]).toEqual(ipVals);
    });

    it('should respond with same items in the list given one exception item with two entries of type list and array of values in document', async () => {
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
        {
          field: 'destination.ip',
          operator: 'included',
          type: 'list',
          list: {
            id: 'ci-badguys-again.txt',
            type: 'ip',
          },
        },
      ];

      // this call represents an exception list with a value list containing ['2.2.2.2']
      (listClient.searchListItemByValues as jest.Mock).mockResolvedValueOnce([
        { ...getSearchListItemResponseMock(), value: ['2.2.2.2', '3.3.3.3'] },
      ]);
      // this call represents an exception list with a value list containing ['4.4.4.4']
      (listClient.searchListItemByValues as jest.Mock).mockResolvedValueOnce([
        { ...getSearchListItemResponseMock(), value: ['3.3.3.3', '4.4.4.4'] },
      ]);

      const [included, excluded] = await filterEventsAgainstList({
        logger: mockLogger,
        listClient,
        exceptionsList: [exceptionItem],
        events: repeatedHitsWithSortId(
          3,
          someGuids.slice(0, 3),
          [
            ['1.1.1.1', '1.1.1.1'],
            ['1.1.1.1', '2.2.2.2'],
            ['2.2.2.2', '3.3.3.3'],
          ],
          [
            ['1.1.1.1', '2.2.2.2'],
            ['2.2.2.2', '3.3.3.3'],
            ['3.3.3.3', '4.4.4.4'],
          ]
        ),
        buildRuleMessage,
      });
      expect(listClient.searchListItemByValues as jest.Mock).toHaveBeenCalledTimes(2);
      expect((listClient.searchListItemByValues as jest.Mock).mock.calls[0][0].value).toEqual([
        ['1.1.1.1', '1.1.1.1'],
        ['1.1.1.1', '2.2.2.2'],
        ['2.2.2.2', '3.3.3.3'],
      ]);
      expect((listClient.searchListItemByValues as jest.Mock).mock.calls[1][0].value).toEqual([
        ['1.1.1.1', '2.2.2.2'],
        ['2.2.2.2', '3.3.3.3'],
        ['3.3.3.3', '4.4.4.4'],
      ]);
      expect(included.length).toEqual(2);
      expect(excluded.length).toEqual(1);

      // @ts-expect-error
      const sourceIpVals = included.map((item) => item._source.source.ip);
      expect([
        ['1.1.1.1', '1.1.1.1'],
        ['1.1.1.1', '2.2.2.2'],
      ]).toEqual(sourceIpVals);
      // @ts-expect-error
      const destIpVals = included.map((item) => item._source.destination.ip);
      expect([
        ['1.1.1.1', '2.2.2.2'],
        ['2.2.2.2', '3.3.3.3'],
      ]).toEqual(destIpVals);
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
      const [included, excluded] = await filterEventsAgainstList({
        logger: mockLogger,
        listClient,
        exceptionsList: [exceptionItem],
        events: repeatedHitsWithSortId(4, someGuids.slice(0, 3)),
        buildRuleMessage,
      });
      expect(included.length).toEqual(0);
      expect(excluded.length).toEqual(4);
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
      listClient.searchListItemByValues = jest.fn(({ value }) =>
        Promise.resolve(
          value.slice(0, 2).map((item) => ({
            ...getSearchListItemResponseMock(),
            value: item,
          }))
        )
      );
      const [included, excluded] = await filterEventsAgainstList({
        logger: mockLogger,
        listClient,
        exceptionsList: [exceptionItem],
        events: repeatedHitsWithSortId(4, someGuids.slice(0, 3), [
          '1.1.1.1',
          '2.2.2.2',
          '3.3.3.3',
          '7.7.7.7',
        ]),
        buildRuleMessage,
      });
      expect((listClient.searchListItemByValues as jest.Mock).mock.calls[0][0].type).toEqual('ip');
      expect((listClient.searchListItemByValues as jest.Mock).mock.calls[0][0].listId).toEqual(
        'ci-badguys.txt'
      );
      expect(included.length).toEqual(2);
      expect(excluded.length).toEqual(2);
    });

    it('should respond with the same items in the list given one exception item with two entries of type list and array of values in document', async () => {
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
        {
          field: 'destination.ip',
          operator: 'excluded',
          type: 'list',
          list: {
            id: 'ci-badguys-again.txt',
            type: 'ip',
          },
        },
      ];

      // this call represents an exception list with a value list containing ['2.2.2.2', '3.3.3.3']
      (listClient.searchListItemByValues as jest.Mock).mockResolvedValueOnce([
        {
          ...getSearchListItemResponseMock(),
          value: ['1.1.1.1', '2.2.2.2'],
        },
      ]);
      // this call represents an exception list with a value list containing ['3.3.3.3', '4.4.4.4']
      (listClient.searchListItemByValues as jest.Mock).mockResolvedValueOnce([
        { ...getSearchListItemResponseMock(), value: ['3.3.3.3', '4.4.4.4'] },
      ]);

      const [included, excluded] = await filterEventsAgainstList({
        logger: mockLogger,
        listClient,
        exceptionsList: [exceptionItem],
        events: repeatedHitsWithSortId(
          3,
          someGuids.slice(0, 3),
          [
            ['1.1.1.1', '1.1.1.1'],
            ['1.1.1.1', '2.2.2.2'],
            ['2.2.2.2', '3.3.3.3'],
          ],
          [
            ['1.1.1.1', '2.2.2.2'],
            ['2.2.2.2', '3.3.3.3'],
            ['3.3.3.3', '4.4.4.4'],
          ]
        ),
        buildRuleMessage,
      });
      expect(listClient.searchListItemByValues as jest.Mock).toHaveBeenCalledTimes(2);
      expect((listClient.searchListItemByValues as jest.Mock).mock.calls[0][0].value).toEqual([
        ['1.1.1.1', '1.1.1.1'],
        ['1.1.1.1', '2.2.2.2'],
        ['2.2.2.2', '3.3.3.3'],
      ]);
      expect((listClient.searchListItemByValues as jest.Mock).mock.calls[1][0].value).toEqual([
        ['1.1.1.1', '2.2.2.2'],
        ['2.2.2.2', '3.3.3.3'],
        ['3.3.3.3', '4.4.4.4'],
      ]);
      expect(included.length).toEqual(2);
      expect(excluded.length).toEqual(1);

      // @ts-expect-error
      const sourceIpVals = included.map((item) => item._source.source.ip);
      expect([
        ['1.1.1.1', '2.2.2.2'],
        ['2.2.2.2', '3.3.3.3'],
      ]).toEqual(sourceIpVals);
      // @ts-expect-error
      const destIpVals = included.map((item) => item._source.destination.ip);
      expect([
        ['2.2.2.2', '3.3.3.3'],
        ['3.3.3.3', '4.4.4.4'],
      ]).toEqual(destIpVals);
    });
  });
});
