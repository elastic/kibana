/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { filterEventsAgainstList } from './filter_events_with_list';
import { mockLogger, repeatedSearchResultsWithSortId } from './__mocks__/es_results';

import { getListItemResponseMock } from '../../../../../lists/common/schemas/response/list_item_schema.mock';
import { listMock } from '../../../../../lists/server/mocks';

const someGuids = Array.from({ length: 13 }).map((x) => uuid.v4());

describe('filterEventsAgainstList', () => {
  let listClient = listMock.getListClient();
  beforeEach(() => {
    jest.clearAllMocks();
    listClient = listMock.getListClient();
    listClient.getListItemByValues = jest.fn().mockResolvedValue([]);
  });

  it('should respond with eventSearchResult if exceptionList is empty', async () => {
    const res = await filterEventsAgainstList({
      logger: mockLogger,
      listClient,
      exceptionsList: undefined,
      eventSearchResult: repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3), [
        '1.1.1.1',
        '2.2.2.2',
        '3.3.3.3',
        '7.7.7.7',
      ]),
    });
    expect(res.hits.hits.length).toEqual(4);
  });

  it('should throw an error if malformed exception list present', async () => {
    let message = '';
    try {
      await filterEventsAgainstList({
        logger: mockLogger,
        listClient,
        exceptionsList: [
          {
            field: 'source.ip',
            values_operator: 'excluded',
            values_type: 'list',
            values: undefined,
          },
        ],
        eventSearchResult: repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3), [
          '1.1.1.1',
          '2.2.2.2',
          '3.3.3.3',
          '7.7.7.7',
        ]),
      });
    } catch (exc) {
      message = exc.message;
    }
    expect(message).toEqual(
      'Failed to query lists index. Reason: Malformed exception list provided'
    );
  });

  it('should throw an error if unsupported exception type', async () => {
    let message = '';
    try {
      await filterEventsAgainstList({
        logger: mockLogger,
        listClient,
        exceptionsList: [
          {
            field: 'source.ip',
            values_operator: 'excluded',
            values_type: 'list',
            values: [
              {
                id: 'ci-badguys.txt',
                name: 'unsupportedListPluginType',
              },
            ],
          },
        ],
        eventSearchResult: repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3), [
          '1.1.1.1',
          '2.2.2.2',
          '3.3.3.3',
          '7.7.7.7',
        ]),
      });
    } catch (exc) {
      message = exc.message;
    }
    expect(message).toEqual(
      'Failed to query lists index. Reason: Unsupported list type used, please use one of ip,keyword'
    );
  });

  describe('operator_type is includes', () => {
    it('should respond with same list if no items match value list', async () => {
      const res = await filterEventsAgainstList({
        logger: mockLogger,
        listClient,
        exceptionsList: [
          {
            field: 'source.ip',
            values_operator: 'included',
            values_type: 'list',
            values: [
              {
                id: 'ci-badguys.txt',
                name: 'ip',
              },
            ],
          },
        ],
        eventSearchResult: repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3)),
      });
      expect(res.hits.hits.length).toEqual(4);
    });
    it('should respond with less items in the list if some values match', async () => {
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
        exceptionsList: [
          {
            field: 'source.ip',
            values_operator: 'included',
            values_type: 'list',
            values: [
              {
                id: 'ci-badguys.txt',
                name: 'ip',
              },
            ],
          },
        ],
        eventSearchResult: repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3), [
          '1.1.1.1',
          '2.2.2.2',
          '3.3.3.3',
          '7.7.7.7',
        ]),
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
      const res = await filterEventsAgainstList({
        logger: mockLogger,
        listClient,
        exceptionsList: [
          {
            field: 'source.ip',
            values_operator: 'excluded',
            values_type: 'list',
            values: [
              {
                id: 'ci-badguys.txt',
                name: 'ip',
              },
            ],
          },
        ],
        eventSearchResult: repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3)),
      });
      expect(res.hits.hits.length).toEqual(0);
    });
    it('should respond with less items in the list if some values match', async () => {
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
        exceptionsList: [
          {
            field: 'source.ip',
            values_operator: 'excluded',
            values_type: 'list',
            values: [
              {
                id: 'ci-badguys.txt',
                name: 'ip',
              },
            ],
          },
        ],
        eventSearchResult: repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3), [
          '1.1.1.1',
          '2.2.2.2',
          '3.3.3.3',
          '7.7.7.7',
        ]),
      });
      expect((listClient.getListItemByValues as jest.Mock).mock.calls[0][0].type).toEqual('ip');
      expect((listClient.getListItemByValues as jest.Mock).mock.calls[0][0].listId).toEqual(
        'ci-badguys.txt'
      );
      expect(res.hits.hits.length).toEqual(2);
    });
  });
});
