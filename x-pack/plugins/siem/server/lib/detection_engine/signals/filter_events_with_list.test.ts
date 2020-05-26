/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { filterEventsAgainstList } from './filter_events_with_list';
import { mockLogger, repeatedSearchResultsWithSortId } from './__mocks__/es_results';

import { ListClient } from '../../../../../lists/server';
import { ListItemArraySchema } from '../../../../../lists/common/schemas';

describe('filterEventsAgainstList', () => {
  const someGuids = Array.from({ length: 13 }).map((x) => uuid.v4());

  it('should respond with eventSearchResult if exceptionList is empty', async () => {
    const res = await filterEventsAgainstList({
      logger: mockLogger,
      listClient: ({
        getListItemByValues: async () => ([] as unknown) as ListItemArraySchema,
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
    try {
      await filterEventsAgainstList({
        logger: mockLogger,
        listClient: ({
          getListItemByValues: async () => ([] as unknown) as ListItemArraySchema,
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
      expect(exc.message).toContain('Malformed exception list provided');
    }
  });

  it('should throw an error if unsupported exception type', async () => {
    try {
      const res = await filterEventsAgainstList({
        logger: mockLogger,
        listClient: ({
          getListItemByValues: async () => ([] as unknown) as ListItemArraySchema,
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
      expect(res.hits.hits.length).toEqual(4);
    } catch (exc) {
      expect(exc.message).toContain('Unsupported list type used, please use one of');
    }
  });

  it('should respond with same list if no items match value list', async () => {
    const res = await filterEventsAgainstList({
      logger: mockLogger,
      listClient: ({
        getListItemByValues: async () => ([] as unknown) as ListItemArraySchema,
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
    expect(res.hits.hits.length).toEqual(4);
  });
  it('should respond with less items in the list if some values match', async () => {
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
          expect(type).toEqual('ip');
          expect(listId).toEqual('ci-badguys.txt');
          const toReturn = value.slice(0, 2).map((item) => ({
            value: item,
          }));
          return (toReturn as unknown) as ListItemArraySchema;
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
    expect(res.hits.hits.length).toEqual(2);
  });
});
