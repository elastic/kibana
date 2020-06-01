/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { filterEventsAgainstList } from './filter_events_with_list';
import { mockLogger, repeatedSearchResultsWithSortId } from './__mocks__/es_results';

import { ListClient } from '../../../../../lists/server';

const someGuids = Array.from({ length: 13 }).map((x) => uuid.v4());

describe('filterEventsAgainstList', () => {
  it('should respond with eventSearchResult if exceptionList is empty', async () => {
    const res = await filterEventsAgainstList({
      logger: mockLogger,
      listClient: ({
        getListItemByValues: async () => [],
      } as unknown) as ListClient,
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
        listClient: ({
          getListItemByValues: async () => [],
        } as unknown) as ListClient,
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
        listClient: ({
          getListItemByValues: async () => [],
        } as unknown) as ListClient,
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
        listClient: ({
          getListItemByValues: async () => [],
        } as unknown) as ListClient,
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
      let outerType = '';
      let outerListId = '';
      const res = await filterEventsAgainstList({
        logger: mockLogger,
        listClient: ({
          getListItemByValues: async ({
            value,
            type,
            listId,
          }: {
            type: string;
            listId: string;
            value: string[];
          }) => {
            outerType = type;
            outerListId = listId;
            return value.slice(0, 2).map((item) => ({
              value: item,
            }));
          },
        } as unknown) as ListClient,
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
      expect(outerType).toEqual('ip');
      expect(outerListId).toEqual('ci-badguys.txt');
      expect(res.hits.hits.length).toEqual(2);
    });
  });
  describe('operator type is excluded', () => {
    it('should respond with empty list if no items match value list', async () => {
      const res = await filterEventsAgainstList({
        logger: mockLogger,
        listClient: ({
          getListItemByValues: async () => [],
        } as unknown) as ListClient,
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
      let outerType = '';
      let outerListId = '';
      const res = await filterEventsAgainstList({
        logger: mockLogger,
        listClient: ({
          getListItemByValues: async ({
            value,
            type,
            listId,
          }: {
            type: string;
            listId: string;
            value: string[];
          }) => {
            outerType = type;
            outerListId = listId;
            return value.slice(0, 2).map((item) => ({
              value: item,
            }));
          },
        } as unknown) as ListClient,
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
      expect(outerType).toEqual('ip');
      expect(outerListId).toEqual('ci-badguys.txt');
      expect(res.hits.hits.length).toEqual(2);
    });
  });
});
