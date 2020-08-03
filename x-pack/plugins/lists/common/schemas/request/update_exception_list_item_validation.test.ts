/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getUpdateExceptionListItemSchemaMock } from './update_exception_list_item_schema.mock';
import { validateComments } from './update_exception_list_item_validation';

describe('update_exception_list_item_validation', () => {
  describe('#validateComments', () => {
    test('it returns no errors if comments is undefined', () => {
      const payload = getUpdateExceptionListItemSchemaMock();
      delete payload.comments;
      const output = validateComments(payload);

      expect(output).toEqual([]);
    });

    test('it returns no errors if new comments are append only', () => {
      const payload = getUpdateExceptionListItemSchemaMock();
      payload.comments = [
        { comment: 'Im an old comment', id: '1' },
        { comment: 'Im a new comment' },
      ];
      const output = validateComments(payload);

      expect(output).toEqual([]);
    });

    test('it returns error if comments are not append only', () => {
      const payload = getUpdateExceptionListItemSchemaMock();
      payload.comments = [
        { comment: 'Im an old comment', id: '1' },
        { comment: 'Im a new comment modifying the order of existing comments' },
        { comment: 'Im an old comment', id: '2' },
      ];
      const output = validateComments(payload);

      expect(output).toEqual(['item "comments" are append only']);
    });
  });
});
