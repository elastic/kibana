/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesColumnsConfiguration } from './use_cases_columns_configuration';
import type { CasesColumnSelection } from './types';

import { mergeSelectedColumnsWithConfiguration, parseUrlQueryParams } from './utils';
import { DEFAULT_QUERY_PARAMS } from '../../containers/use_get_cases';

const DEFAULT_STRING_QUERY_PARAMS = {
  ...DEFAULT_QUERY_PARAMS,
  page: String(DEFAULT_QUERY_PARAMS.page),
  perPage: String(DEFAULT_QUERY_PARAMS.perPage),
};

describe('utils', () => {
  describe('parseUrlQueryParams', () => {
    it('valid input is processed correctly', () => {
      expect(parseUrlQueryParams(DEFAULT_STRING_QUERY_PARAMS)).toStrictEqual(DEFAULT_QUERY_PARAMS);
    });

    it('empty string value for page/perPage is ignored', () => {
      expect(
        parseUrlQueryParams({
          ...DEFAULT_STRING_QUERY_PARAMS,
          page: '',
          perPage: '',
        })
      ).toStrictEqual({
        sortField: DEFAULT_QUERY_PARAMS.sortField,
        sortOrder: DEFAULT_QUERY_PARAMS.sortOrder,
      });
    });

    it('0 value for page/perPage is ignored', () => {
      expect(
        parseUrlQueryParams({
          ...DEFAULT_STRING_QUERY_PARAMS,
          page: '0',
          perPage: '0',
        })
      ).toStrictEqual({
        sortField: DEFAULT_QUERY_PARAMS.sortField,
        sortOrder: DEFAULT_QUERY_PARAMS.sortOrder,
      });
    });

    it('invalid string values for page/perPage are ignored', () => {
      expect(
        parseUrlQueryParams({
          ...DEFAULT_STRING_QUERY_PARAMS,
          page: 'foo',
          perPage: 'bar',
        })
      ).toStrictEqual({
        sortField: DEFAULT_QUERY_PARAMS.sortField,
        sortOrder: DEFAULT_QUERY_PARAMS.sortOrder,
      });
    });

    it('additional URL parameters are ignored', () => {
      expect(
        parseUrlQueryParams({
          ...DEFAULT_STRING_QUERY_PARAMS,
          foo: 'bar',
        })
      ).toStrictEqual(DEFAULT_QUERY_PARAMS);
    });
  });

  describe('mergeSelectedColumnsWithConfiguration', () => {
    const mockConfiguration: CasesColumnsConfiguration = {
      foo: { field: 'foo', name: 'foo', canDisplay: true, isCheckedDefault: true },
      bar: { field: 'bar', name: 'bar', canDisplay: true, isCheckedDefault: true },
    };
    const mockSelectedColumns: CasesColumnSelection[] = [
      { field: 'foo', name: 'foo', isChecked: true },
      { field: 'bar', name: 'bar', isChecked: true },
    ];

    it('does not return selectedColumns without a matching configuration', () => {
      expect(
        mergeSelectedColumnsWithConfiguration({
          selectedColumns: [
            ...mockSelectedColumns,
            { field: 'foobar', name: 'foobar', isChecked: true },
          ],
          casesColumnsConfig: mockConfiguration,
        })
      ).toStrictEqual(mockSelectedColumns);
    });

    it('does not return selectedColumns with canDisplay value false in configuration', () => {
      expect(
        mergeSelectedColumnsWithConfiguration({
          selectedColumns: mockSelectedColumns,
          casesColumnsConfig: {
            ...mockConfiguration,
            bar: { ...mockConfiguration.bar, canDisplay: false },
          },
        })
      ).toStrictEqual([mockSelectedColumns[0]]);
    });

    it('does not return selectedColumns without a field in the configuration', () => {
      expect(
        mergeSelectedColumnsWithConfiguration({
          selectedColumns: mockSelectedColumns,
          casesColumnsConfig: {
            ...mockConfiguration,
            bar: { ...mockConfiguration.bar, field: '' },
          },
        })
      ).toStrictEqual([mockSelectedColumns[0]]);
    });

    it('result contains columns missing in the selectedColumns with isChecked false', () => {
      expect(
        mergeSelectedColumnsWithConfiguration({
          selectedColumns: [],
          casesColumnsConfig: mockConfiguration,
        })
      ).toStrictEqual([
        { field: 'foo', name: 'foo', isChecked: true },
        { field: 'bar', name: 'bar', isChecked: true },
      ]);
    });

    it('result does not include columns missing in the selectedColumns when canDisplay=false', () => {
      expect(
        mergeSelectedColumnsWithConfiguration({
          selectedColumns: [],
          casesColumnsConfig: {
            ...mockConfiguration,
            foobar: { field: 'foobar', name: 'foobar', canDisplay: false, isCheckedDefault: false },
          },
        })
      ).toStrictEqual([
        { field: 'foo', name: 'foo', isChecked: true },
        { field: 'bar', name: 'bar', isChecked: true },
      ]);
    });
  });
});
