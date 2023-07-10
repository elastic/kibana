/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { comment, actionComment } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { MAX_COMMENT_LENGTH } from '../../../common/constants';
import { update } from './update';

describe('update', () => {
  const clientArgs = createCasesClientMockArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('comments', () => {
    const updateComment = { ...comment, id: 'comment-id', version: 'WzAsMV0=' };
    it('should throw an error if the comment length is too long', async () => {
      const longComment = Array(MAX_COMMENT_LENGTH + 1)
        .fill('x')
        .toString();

      await expect(
        update(
          { updateRequest: { ...updateComment, comment: longComment }, caseID: 'test-case' },
          clientArgs
        )
      ).rejects.toThrow(
        `Failed to patch comment case id: test-case: Error: The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH}.`
      );
    });

    it('should throw an error if the comment is an empty string', async () => {
      await expect(
        update(
          { updateRequest: { ...updateComment, comment: '' }, caseID: 'test-case' },
          clientArgs
        )
      ).rejects.toThrow(
        'Failed to patch comment case id: test-case: Error: The comment field cannot be an empty string.'
      );
    });

    it('should throw an error if the description is a string with empty characters', async () => {
      await expect(
        update(
          { updateRequest: { ...updateComment, comment: '  ' }, caseID: 'test-case' },
          clientArgs
        )
      ).rejects.toThrow(
        'Failed to patch comment case id: test-case: Error: The comment field cannot be an empty string.'
      );
    });
  });

  describe('actions', () => {
    const updateActionComment = { ...actionComment, id: 'comment-id', version: 'WzAsMV0=' };

    it('should throw an error if the comment length is too long', async () => {
      const longComment = Array(MAX_COMMENT_LENGTH + 1)
        .fill('x')
        .toString();

      await expect(
        update(
          { updateRequest: { ...updateActionComment, comment: longComment }, caseID: 'test-case' },
          clientArgs
        )
      ).rejects.toThrow(
        `Failed to patch comment case id: test-case: Error: The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH}.`
      );
    });

    it('should throw an error if the comment is an empty string', async () => {
      await expect(
        update(
          { updateRequest: { ...updateActionComment, comment: '' }, caseID: 'test-case' },
          clientArgs
        )
      ).rejects.toThrow(
        'Failed to patch comment case id: test-case: Error: The comment field cannot be an empty string.'
      );
    });

    it('should throw an error if the description is a string with empty characters', async () => {
      await expect(
        update(
          { updateRequest: { ...updateActionComment, comment: '  ' }, caseID: 'test-case' },
          clientArgs
        )
      ).rejects.toThrow(
        'Failed to patch comment case id: test-case: Error: The comment field cannot be an empty string.'
      );
    });
  });
});
