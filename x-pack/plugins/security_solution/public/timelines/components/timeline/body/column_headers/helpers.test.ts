/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockBrowserFields } from '../../../../../common/containers/source/mock';
import type { BrowserFields } from '../../../../../../common/search_strategy';
import type { ColumnHeaderOptions } from '../../../../../../common/types';
import { DEFAULT_COLUMN_MIN_WIDTH, DEFAULT_DATE_COLUMN_MIN_WIDTH } from '../constants';
import { defaultHeaders } from './default_headers';
import { defaultUdtHeaders } from '../../unified_components/default_headers';
import {
  getColumnWidthFromType,
  getColumnHeaders,
  getRootCategory,
  getColumnHeader,
} from './helpers';

describe('helpers', () => {
  describe('getColumnWidthFromType', () => {
    test('it returns the expected width for a non-date column', () => {
      expect(getColumnWidthFromType('keyword')).toEqual(DEFAULT_COLUMN_MIN_WIDTH);
    });

    test('it returns the expected width for a date column', () => {
      expect(getColumnWidthFromType('date')).toEqual(DEFAULT_DATE_COLUMN_MIN_WIDTH);
    });
  });

  describe('getRootCategory', () => {
    const baseFields = ['@timestamp', '_id', 'message'];

    baseFields.forEach((field) => {
      test(`it returns the 'base' category for the ${field} field`, () => {
        expect(
          getRootCategory({
            field,
            browserFields: mockBrowserFields,
          })
        ).toEqual('base');
      });
    });

    test(`it echos the field name for a field that's NOT in the base category`, () => {
      const field = 'test_field_1';

      expect(
        getRootCategory({
          field,
          browserFields: mockBrowserFields,
        })
      ).toEqual(field);
    });
  });

  describe('getColumnHeader', () => {
    test('it should return column header non existing in defaultHeaders', () => {
      const field = 'test_field_1';

      expect(getColumnHeader(field, [])).toEqual({
        columnHeaderType: 'not-filtered',
        id: field,
        initialWidth: DEFAULT_COLUMN_MIN_WIDTH,
      });
    });

    test('it should return column header existing in defaultHeaders', () => {
      const field = 'test_field_1';

      expect(
        getColumnHeader(field, [
          {
            columnHeaderType: 'not-filtered',
            id: field,
            initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH,
            esTypes: ['date'],
            type: 'date',
          },
        ])
      ).toEqual({
        columnHeaderType: 'not-filtered',
        id: field,
        initialWidth: DEFAULT_DATE_COLUMN_MIN_WIDTH,
        esTypes: ['date'],
        type: 'date',
      });
    });

    test('should return the expected metadata in case of unified header', () => {
      const inputHeaders = defaultUdtHeaders;
      expect(getColumnHeader('@timestamp', inputHeaders)).toEqual({
        columnHeaderType: 'not-filtered',
        id: '@timestamp',
        initialWidth: 215,
        esTypes: ['date'],
        type: 'date',
      });
    });
  });

  describe('getColumnHeaders', () => {
    test('should return a full object of ColumnHeader from the default header', () => {
      const expectedData = [
        {
          aggregatable: true,
          columnHeaderType: 'not-filtered',
          id: '@timestamp',
          name: '@timestamp',
          readFromDocValues: true,
          searchable: true,
          type: 'date',
          esTypes: ['date'],
          initialWidth: 190,
        },
        {
          aggregatable: true,
          columnHeaderType: 'not-filtered',
          id: 'source.ip',
          name: 'source.ip',
          searchable: true,
          type: 'ip',
          esTypes: ['ip'],
          initialWidth: 180,
        },
        {
          aggregatable: true,
          columnHeaderType: 'not-filtered',
          id: 'destination.ip',
          name: 'destination.ip',
          searchable: true,
          type: 'ip',
          esTypes: ['ip'],
          initialWidth: 180,
        },
      ];
      const mockHeader = defaultHeaders.filter((h) =>
        ['@timestamp', 'source.ip', 'destination.ip'].includes(h.id)
      );
      expect(getColumnHeaders(mockHeader, mockBrowserFields)).toEqual(expectedData);
    });

    test('it should return the expected metadata for the `_id` field, which is one level deep, and belongs to the `base` category', () => {
      const headers: ColumnHeaderOptions[] = [
        {
          columnHeaderType: 'not-filtered',
          id: '_id',
          initialWidth: 180,
        },
      ];

      expect(getColumnHeaders(headers, mockBrowserFields)).toEqual([
        {
          aggregatable: false,
          columnHeaderType: 'not-filtered',
          esTypes: [],
          id: '_id',
          initialWidth: 180,
          name: '_id',
          searchable: true,
          type: 'string',
        },
      ]);
    });

    test('it should return the expected metadata for a field one level deep that does NOT belong to the `base` category', () => {
      const headers: ColumnHeaderOptions[] = [
        {
          columnHeaderType: 'not-filtered',
          id: 'test_field_1', // one level deep, but does NOT belong to the `base` category
          initialWidth: 180,
        },
      ];

      const oneLevelDeep: BrowserFields = {
        test_field_1: {
          fields: {
            test_field_1: {
              aggregatable: true,
              esTypes: ['keyword'],
              format: { id: 'string' },
              name: 'test_field_1',
              readFromDocValues: true,
              searchable: true,
              type: 'string',
            },
          },
        },
      };

      expect(getColumnHeaders(headers, oneLevelDeep)).toEqual([
        {
          aggregatable: true,
          columnHeaderType: 'not-filtered',
          esTypes: ['keyword'],
          format: { id: 'string' },
          id: 'test_field_1',
          initialWidth: 180,
          name: 'test_field_1',
          readFromDocValues: true,
          searchable: true,
          type: 'string',
        },
      ]);
    });

    test('it should return the expected metadata for a field that is more than one level deep', () => {
      const headers: ColumnHeaderOptions[] = [
        {
          columnHeaderType: 'not-filtered',
          id: 'foo.bar', // two levels deep
          initialWidth: 180,
        },
      ];

      const twoLevelsDeep: BrowserFields = {
        foo: {
          fields: {
            'foo.bar': {
              aggregatable: true,
              esTypes: ['keyword'],
              format: { id: 'string' },
              name: 'foo.bar',
              readFromDocValues: true,
              searchable: true,
              type: 'string',
            },
          },
        },
      };

      expect(getColumnHeaders(headers, twoLevelsDeep)).toEqual([
        {
          aggregatable: true,
          columnHeaderType: 'not-filtered',
          esTypes: ['keyword'],
          format: { id: 'string' },
          id: 'foo.bar',
          initialWidth: 180,
          name: 'foo.bar',
          readFromDocValues: true,
          searchable: true,
          type: 'string',
        },
      ]);
    });

    test('it should return the expected metadata for an UNKNOWN field one level deep', () => {
      const headers: ColumnHeaderOptions[] = [
        {
          columnHeaderType: 'not-filtered',
          id: 'unknown', // one level deep, but not contained in the `BrowserFields`
          initialWidth: 180,
        },
      ];

      expect(getColumnHeaders(headers, mockBrowserFields)).toEqual([
        {
          columnHeaderType: 'not-filtered',
          id: 'unknown',
          initialWidth: 180,
        },
      ]);
    });

    test('it should return the expected metadata for an UNKNOWN field that is more than one level deep', () => {
      const headers: ColumnHeaderOptions[] = [
        {
          columnHeaderType: 'not-filtered',
          id: 'unknown.more.than.one.level', // more than one level deep, and not contained in the `BrowserFields`
          initialWidth: 180,
        },
      ];

      expect(getColumnHeaders(headers, mockBrowserFields)).toEqual([
        {
          columnHeaderType: 'not-filtered',
          id: 'unknown.more.than.one.level',
          initialWidth: 180,
        },
      ]);
    });
  });
});
