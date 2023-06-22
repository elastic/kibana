/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateFindCommentsPagination } from './validators';

const ERROR_MSG =
  'The number of documents is too high. Paginating through more than 10,000 documents is not possible.';

describe('validators', () => {
  describe('validateFindCommentsPagination', () => {
    it('does not throw if only page is undefined', () => {
      expect(() => validateFindCommentsPagination({ perPage: 100 })).not.toThrowError();
    });

    it('does not throw if only perPage is undefined', () => {
      expect(() => validateFindCommentsPagination({ page: 100 })).not.toThrowError();
    });

    it('returns if page and perPage are undefined', () => {
      expect(() => validateFindCommentsPagination({})).not.toThrowError();
    });

    it('throws if page > 10k', () => {
      expect(() => validateFindCommentsPagination({ page: 10001 })).toThrow(ERROR_MSG);
    });

    it('throws if perPage > 10k', () => {
      expect(() => validateFindCommentsPagination({ perPage: 10001 })).toThrowError(ERROR_MSG);
    });

    it('throws if page * perPage > 10k', () => {
      expect(() => validateFindCommentsPagination({ page: 10, perPage: 1001 })).toThrow(ERROR_MSG);
    });
  });
});
