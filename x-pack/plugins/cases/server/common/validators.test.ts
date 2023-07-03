/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validatePagination } from './validators';

const MAX_PER_PAGE = 666;

const ERROR_MSG =
  'The number of documents is too high. Paginating through more than 10,000 documents is not possible.';

const ERROR_MSG_PER_PAGE = `The provided perPage value was too high. The maximum allowed perPage value is ${MAX_PER_PAGE}.`;

describe('validators', () => {
  describe('validatePagination', () => {
    it('does not throw if only page is undefined', () => {
      expect(() =>
        validatePagination({ perPage: 100, maxPerPage: MAX_PER_PAGE })
      ).not.toThrowError();
    });

    it('does not throw if only perPage is undefined', () => {
      expect(() => validatePagination({ page: 100, maxPerPage: MAX_PER_PAGE })).not.toThrowError();
    });

    it('does not throw if page and perPage are defined and valid', () => {
      expect(() =>
        validatePagination({ page: 2, perPage: 100, maxPerPage: MAX_PER_PAGE })
      ).not.toThrowError();
    });

    it('returns if page and perPage are undefined', () => {
      expect(() => validatePagination({ maxPerPage: MAX_PER_PAGE })).not.toThrowError();
    });

    it('returns if perPage < 0', () => {
      expect(() =>
        validatePagination({ perPage: -1, maxPerPage: MAX_PER_PAGE })
      ).not.toThrowError();
    });

    it('throws if page > 10k', () => {
      expect(() => validatePagination({ page: 10001, maxPerPage: MAX_PER_PAGE })).toThrow(
        ERROR_MSG
      );
    });

    it(`throws if perPage > maxPerPage parameter`, () => {
      expect(() =>
        validatePagination({ perPage: MAX_PER_PAGE + 1, maxPerPage: MAX_PER_PAGE })
      ).toThrowError(ERROR_MSG_PER_PAGE);
    });

    it('throws if page * perPage > 10k', () => {
      expect(() =>
        validatePagination({ page: 101, perPage: 100, maxPerPage: MAX_PER_PAGE })
      ).toThrow(ERROR_MSG);
    });
  });
});
