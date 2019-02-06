/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';
import { mockIndexPattern } from '../../mock';
import { NotesById } from '../../store/local/app/model';
import { mockDataProviders } from './data_providers/mock/mock_data_providers';
import { buildGlobalQuery, combineQueries, getEventNotes } from './helpers';

const cleanUpKqlQuery = (str: string) => str.replace(/\n/g, '').replace(/\s\s+/g, ' ');

describe('Build KQL Query', () => {
  test('Buld KQL query with one data provider', () => {
    const dataProviders = mockDataProviders.slice(0, 1);
    const kqlQuery = buildGlobalQuery(dataProviders);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual(
      '( name : Provider 1 and @timestamp >= 1521830963132 and @timestamp <= 1521862432253 )'
    );
  });

  test('Buld KQL query with two data provider', () => {
    const dataProviders = mockDataProviders.slice(0, 2);
    const kqlQuery = buildGlobalQuery(dataProviders);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual(
      '( name : Provider 1 and @timestamp >= 1521830963132 and @timestamp <= 1521862432253 ) or ( name : Provider 2 and @timestamp >= 1521830963132 and @timestamp <= 1521862432253 )'
    );
  });

  test('Buld KQL query with one data provider and one and', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 1));
    dataProviders[0].and = mockDataProviders.slice(1, 2);
    const kqlQuery = buildGlobalQuery(dataProviders);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual(
      '( name : Provider 1 and @timestamp >= 1521830963132 and @timestamp <= 1521862432253 and name : Provider 2)'
    );
  });

  test('Buld KQL query with two data provider and mutiple and', () => {
    const dataProviders = cloneDeep(mockDataProviders.slice(0, 2));
    dataProviders[0].and = mockDataProviders.slice(2, 4);
    dataProviders[1].and = mockDataProviders.slice(4, 5);
    const kqlQuery = buildGlobalQuery(dataProviders);
    expect(cleanUpKqlQuery(kqlQuery)).toEqual(
      '( name : Provider 1 and @timestamp >= 1521830963132 and @timestamp <= 1521862432253 and name : Provider 3 and name : Provider 4) or ( name : Provider 2 and @timestamp >= 1521830963132 and @timestamp <= 1521862432253 and name : Provider 5)'
    );
  });
});

describe('Combined Queries', () => {
  test('No Data Provider & No kqlQuery', () => {
    expect(combineQueries([], mockIndexPattern, '')).toBeNull();
  });

  test('Only Data Provider', () => {
    const dataProviders = mockDataProviders.slice(0, 1);
    const { filterQuery } = combineQueries(dataProviders, mockIndexPattern, '')!;
    expect(filterQuery).toEqual(
      '{"bool":{"filter":[{"bool":{"should":[{"match":{"name":"Provider 1"}}],"minimum_should_match":1}},{"bool":{"filter":[{"bool":{"should":[{"range":{"@timestamp":{"gte":1521830963132}}}],"minimum_should_match":1}},{"bool":{"should":[{"range":{"@timestamp":{"lte":1521862432253}}}],"minimum_should_match":1}}]}}]}}'
    );
  });

  test('Only KQL query', () => {
    const { filterQuery } = combineQueries([], mockIndexPattern, 'host.name: "host-1"')!;
    expect(filterQuery).toEqual(
      '{"bool":{"should":[{"match_phrase":{"host.name":"host-1"}}],"minimum_should_match":1}}'
    );
  });

  test('Data Provider & KQL query', () => {
    const dataProviders = mockDataProviders.slice(0, 1);
    const { filterQuery } = combineQueries(dataProviders, mockIndexPattern, 'host.name: "host-1"')!;
    expect(filterQuery).toEqual(
      '{"bool":{"should":[{"bool":{"filter":[{"bool":{"should":[{"match":{"name":"Provider 1"}}],"minimum_should_match":1}},{"bool":{"filter":[{"bool":{"should":[{"range":{"@timestamp":{"gte":1521830963132}}}],"minimum_should_match":1}},{"bool":{"should":[{"range":{"@timestamp":{"lte":1521862432253}}}],"minimum_should_match":1}}]}}]}},{"bool":{"should":[{"match_phrase":{"host.name":"host-1"}}],"minimum_should_match":1}}],"minimum_should_match":1}}'
    );
  });

  describe('getEventNotes', () => {
    test('it returns the expected notes for all events in eventIdToNoteIds that have notes associated with them', () => {
      const sameDate = new Date();
      const eventIdToNoteIds: { [eventId: string]: string[] } = {
        a: ['123'],
        b: [],
        c: ['does-not-exist', '10', '11'],
        d: ['also-does-not-exist'],
      };
      const notesById: NotesById = {
        '123': {
          created: sameDate,
          id: '123',
          lastEdit: sameDate,
          note: 'you can count',
          user: 'sesame.st',
        },
        '10': {
          created: sameDate,
          id: '10',
          lastEdit: sameDate,
          note: 'on two hands',
          user: 'monkey',
        },
        '11': {
          created: sameDate,
          id: '11',
          lastEdit: sameDate,
          note: 'extra',
          user: 'finger',
        },
      };

      expect(getEventNotes({ eventIdToNoteIds, notesById })).toEqual({
        a: [
          {
            created: sameDate,
            id: '123',
            lastEdit: sameDate,
            note: 'you can count',
            user: 'sesame.st',
          },
        ],
        b: [],
        c: [
          {
            created: sameDate,
            id: '10',
            lastEdit: sameDate,
            note: 'on two hands',
            user: 'monkey',
          },
          {
            created: sameDate,
            id: '11',
            lastEdit: sameDate,
            note: 'extra',
            user: 'finger',
          },
        ],
        d: [],
      });
    });
  });
});
