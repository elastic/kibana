/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateFindCommentsPagination } from './validators';
import { MAX_COMMENTS_PER_PAGE } from '../../../common/constants';

const ERROR_MSG =
  'The number of documents is too high. Paginating through more than 10,000 documents is not possible.';

const ERROR_MSG_PER_PAGE = `The provided perPage value was too high. The maximum allowed perPage value is ${MAX_COMMENTS_PER_PAGE}.`;

describe('validators', () => {
  describe('validateFindCommentsPagination', () => {
    it('does not throw if only page is undefined', () => {
      expect(() => validateFindCommentsPagination({ perPage: 100 })).not.toThrowError();
    });

    it('does not throw if only perPage is undefined', () => {
      expect(() => validateFindCommentsPagination({ page: 100 })).not.toThrowError();
    });

    it('does not throw if page and perPage are defined and valid', () => {
      expect(() => validateFindCommentsPagination({ page: 2, perPage: 100 })).not.toThrowError();
    });

    it('returns if page and perPage are undefined', () => {
      expect(() => validateFindCommentsPagination({})).not.toThrowError();
    });

    it('returns if perPage < 0', () => {
      expect(() => validateFindCommentsPagination({ perPage: -1 })).not.toThrowError();
    });

    it('throws if page > 10k', () => {
      expect(() => validateFindCommentsPagination({ page: 10001 })).toThrow(ERROR_MSG);
    });

    it('throws if perPage > 100', () => {
      expect(() =>
        validateFindCommentsPagination({ perPage: MAX_COMMENTS_PER_PAGE + 1 })
      ).toThrowError(ERROR_MSG_PER_PAGE);
    });

    it('throws if page * perPage > 10k', () => {
      expect(() => validateFindCommentsPagination({ page: 101, perPage: 100 })).toThrow(ERROR_MSG);
    });
  });
});
