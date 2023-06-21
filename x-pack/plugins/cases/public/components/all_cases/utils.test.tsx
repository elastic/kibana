/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseUrlQueryParams } from './utils';
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
});
