/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GetTrustedAppsRequestSchema } from './trusted_apps';

describe('When invoking Trusted Apps Schema', () => {
  describe('for GET List', () => {
    const getListQueryParams = (page: unknown = 1, perPage: unknown = 20) => ({
      page,
      per_page: perPage,
    });
    const query = GetTrustedAppsRequestSchema.query;

    describe('query param validation', () => {
      it('should return query params if valid', () => {
        expect(query.validate(getListQueryParams())).toEqual({
          page: 1,
          per_page: 20,
        });
      });

      it('should use default values', () => {
        expect(query.validate(getListQueryParams(undefined, undefined))).toEqual({
          page: 1,
          per_page: 20,
        });
        expect(query.validate(getListQueryParams(undefined, 100))).toEqual({
          page: 1,
          per_page: 100,
        });
        expect(query.validate(getListQueryParams(10, undefined))).toEqual({
          page: 10,
          per_page: 20,
        });
      });

      it('should throw if `page` param is not a number', () => {
        expect(() => {
          query.validate(getListQueryParams('one'));
        }).toThrowError();
      });

      it('should throw if `page` param is less than 1', () => {
        expect(() => {
          query.validate(getListQueryParams(0));
        }).toThrowError();
        expect(() => {
          query.validate(getListQueryParams(-1));
        }).toThrowError();
      });

      it('should throw if `per_page` param is not a number', () => {
        expect(() => {
          query.validate(getListQueryParams(1, 'twenty'));
        }).toThrowError();
      });

      it('should throw if `per_page` param is less than 1', () => {
        expect(() => {
          query.validate(getListQueryParams(1, 0));
        }).toThrowError();
        expect(() => {
          query.validate(getListQueryParams(1, -1));
        }).toThrowError();
      });
    });
  });
});
