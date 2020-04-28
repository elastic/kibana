/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  getStringArray,
  replaceTemplateFieldFromQuery,
  replaceTemplateFieldFromMatchFilters,
  reformatDataProviderWithNewValue,
} from './helpers';
import { mockEcsData } from '../../../../mock/mock_ecs';
import { Filter } from '../../../../../../../../src/plugins/data/public';
import { DataProvider } from '../../../../components/timeline/data_providers/data_provider';
import { mockDataProviders } from '../../../../components/timeline/data_providers/mock/mock_data_providers';
import { cloneDeep } from 'lodash/fp';

describe('helpers', () => {
  let mockEcsDataClone = cloneDeep(mockEcsData);
  beforeEach(() => {
    mockEcsDataClone = cloneDeep(mockEcsData);
  });
  describe('getStringOrStringArray', () => {
    test('it should correctly return a string array', () => {
      const value = getStringArray('x', {
        x: 'The nickname of the developer we all :heart:',
      });
      expect(value).toEqual(['The nickname of the developer we all :heart:']);
    });

    test('it should correctly return a string array with a single element', () => {
      const value = getStringArray('x', {
        x: ['The nickname of the developer we all :heart:'],
      });
      expect(value).toEqual(['The nickname of the developer we all :heart:']);
    });

    test('it should correctly return a string array with two elements of strings', () => {
      const value = getStringArray('x', {
        x: ['The nickname of the developer we all :heart:', 'We are all made of stars'],
      });
      expect(value).toEqual([
        'The nickname of the developer we all :heart:',
        'We are all made of stars',
      ]);
    });

    test('it should correctly return a string array with deep elements', () => {
      const value = getStringArray('x.y.z', {
        x: { y: { z: 'zed' } },
      });
      expect(value).toEqual(['zed']);
    });

    test('it should correctly return a string array with a non-existent value', () => {
      const value = getStringArray('non.existent', {
        x: { y: { z: 'zed' } },
      });
      expect(value).toEqual([]);
    });

    test('it should trace an error if the value is not a string', () => {
      const mockConsole: Console = ({ trace: jest.fn() } as unknown) as Console;
      const value = getStringArray('a', { a: 5 }, mockConsole);
      expect(value).toEqual([]);
      expect(
        mockConsole.trace
      ).toHaveBeenCalledWith(
        'Data type that is not a string or string array detected:',
        5,
        'when trying to access field:',
        'a',
        'from data object of:',
        { a: 5 }
      );
    });

    test('it should trace an error if the value is an array of mixed values', () => {
      const mockConsole: Console = ({ trace: jest.fn() } as unknown) as Console;
      const value = getStringArray('a', { a: ['hi', 5] }, mockConsole);
      expect(value).toEqual([]);
      expect(
        mockConsole.trace
      ).toHaveBeenCalledWith(
        'Data type that is not a string or string array detected:',
        ['hi', 5],
        'when trying to access field:',
        'a',
        'from data object of:',
        { a: ['hi', 5] }
      );
    });
  });

  describe('replaceTemplateFieldFromQuery', () => {
    test('given an empty query string this returns an empty query string', () => {
      const replacement = replaceTemplateFieldFromQuery('', mockEcsDataClone[0]);
      expect(replacement).toEqual('');
    });

    test('given a query string with spaces this returns an empty query string', () => {
      const replacement = replaceTemplateFieldFromQuery('    ', mockEcsDataClone[0]);
      expect(replacement).toEqual('');
    });

    test('it should replace a query with a template value such as apache from a mock template', () => {
      const replacement = replaceTemplateFieldFromQuery(
        'host.name: placeholdertext',
        mockEcsDataClone[0]
      );
      expect(replacement).toEqual('host.name: apache');
    });

    test('it should replace a template field with an ECS value that is not an array', () => {
      mockEcsDataClone[0].host!.name = ('apache' as unknown) as string[]; // very unsafe cast for this test case
      const replacement = replaceTemplateFieldFromQuery('host.name: *', mockEcsDataClone[0]);
      expect(replacement).toEqual('host.name: *');
    });

    test('it should NOT replace a query with a template value that is not part of the template fields array', () => {
      const replacement = replaceTemplateFieldFromQuery(
        'user.id: placeholdertext',
        mockEcsDataClone[0]
      );
      expect(replacement).toEqual('user.id: placeholdertext');
    });
  });

  describe('replaceTemplateFieldFromMatchFilters', () => {
    test('given an empty query filter this will return an empty filter', () => {
      const replacement = replaceTemplateFieldFromMatchFilters([], mockEcsDataClone[0]);
      expect(replacement).toEqual([]);
    });

    test('given a query filter this will return that filter with the placeholder replaced', () => {
      const filters: Filter[] = [
        {
          meta: {
            type: 'phrase',
            key: 'host.name',
            alias: 'alias',
            disabled: false,
            negate: false,
            params: { query: 'Braden' },
          },
          query: { match_phrase: { 'host.name': 'Braden' } },
        },
      ];
      const replacement = replaceTemplateFieldFromMatchFilters(filters, mockEcsDataClone[0]);
      const expected: Filter[] = [
        {
          meta: {
            type: 'phrase',
            key: 'host.name',
            alias: 'alias',
            disabled: false,
            negate: false,
            params: { query: 'apache' },
          },
          query: { match_phrase: { 'host.name': 'apache' } },
        },
      ];
      expect(replacement).toEqual(expected);
    });

    test('given a query filter with a value not in the templateFields, this will NOT replace the placeholder value', () => {
      const filters: Filter[] = [
        {
          meta: {
            type: 'phrase',
            key: 'user.id',
            alias: 'alias',
            disabled: false,
            negate: false,
            params: { query: 'Evan' },
          },
          query: { match_phrase: { 'user.id': 'Evan' } },
        },
      ];
      const replacement = replaceTemplateFieldFromMatchFilters(filters, mockEcsDataClone[0]);
      const expected: Filter[] = [
        {
          meta: {
            type: 'phrase',
            key: 'user.id',
            alias: 'alias',
            disabled: false,
            negate: false,
            params: { query: 'Evan' },
          },
          query: { match_phrase: { 'user.id': 'Evan' } },
        },
      ];
      expect(replacement).toEqual(expected);
    });
  });

  describe('reformatDataProviderWithNewValue', () => {
    test('it should replace a query with a template value such as apache from a mock data provider', () => {
      const mockDataProvider: DataProvider = mockDataProviders[0];
      mockDataProvider.queryMatch.field = 'host.name';
      mockDataProvider.id = 'Braden';
      mockDataProvider.name = 'Braden';
      mockDataProvider.queryMatch.value = 'Braden';
      const replacement = reformatDataProviderWithNewValue(mockDataProvider, mockEcsDataClone[0]);
      expect(replacement).toEqual({
        id: 'apache',
        name: 'apache',
        enabled: true,
        excluded: false,
        kqlQuery: '',
        queryMatch: {
          field: 'host.name',
          value: 'apache',
          operator: ':',
          displayField: undefined,
          displayValue: undefined,
        },
        and: [],
      });
    });

    test('it should replace a query with a template value such as apache from a mock data provider using a string in the data provider', () => {
      mockEcsDataClone[0].host!.name = ('apache' as unknown) as string[]; // very unsafe cast for this test case
      const mockDataProvider: DataProvider = mockDataProviders[0];
      mockDataProvider.queryMatch.field = 'host.name';
      mockDataProvider.id = 'Braden';
      mockDataProvider.name = 'Braden';
      mockDataProvider.queryMatch.value = 'Braden';
      const replacement = reformatDataProviderWithNewValue(mockDataProvider, mockEcsDataClone[0]);
      expect(replacement).toEqual({
        id: 'apache',
        name: 'apache',
        enabled: true,
        excluded: false,
        kqlQuery: '',
        queryMatch: {
          field: 'host.name',
          value: 'apache',
          operator: ':',
          displayField: undefined,
          displayValue: undefined,
        },
        and: [],
      });
    });

    test('it should NOT replace a query with a template value that is not part of a template such as user.id', () => {
      const mockDataProvider: DataProvider = mockDataProviders[0];
      mockDataProvider.queryMatch.field = 'user.id';
      mockDataProvider.id = 'my-id';
      mockDataProvider.name = 'Rebecca';
      mockDataProvider.queryMatch.value = 'Rebecca';
      const replacement = reformatDataProviderWithNewValue(mockDataProvider, mockEcsDataClone[0]);
      expect(replacement).toEqual({
        id: 'my-id',
        name: 'Rebecca',
        enabled: true,
        excluded: false,
        kqlQuery: '',
        queryMatch: {
          field: 'user.id',
          value: 'Rebecca',
          operator: ':',
          displayField: undefined,
          displayValue: undefined,
        },
        and: [],
      });
    });
  });
});
