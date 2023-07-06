/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ADD_COMMENTS, MAX_COMMENT_LENGTH } from '../../../common/constants';
import { comment, actionComment } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { bulkCreate } from './bulk_create';

describe('bulkCreate', () => {
  const clientArgs = createCasesClientMockArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws with excess fields', async () => {
    await expect(
      // @ts-expect-error: excess attribute
      bulkCreate({ attachments: [{ ...comment, foo: 'bar' }], caseId: 'test-case' }, clientArgs)
    ).rejects.toThrow('invalid keys "foo"');
  });

  it('throws when trying to add too many attachments - BulkCreateCommentRequestRt', async () => {
    await expect(
      bulkCreate(
        {
          attachments: Array(MAX_ADD_COMMENTS + 1).fill({ ...comment, foo: 'bar' }),
          caseId: 'test-case',
        },
        clientArgs
      )
    ).rejects.toThrow(
      'Failed while bulk creating attachment to case id: test-case error: Error: The length of the field attachments is too long. Array must be of length <= 100.'
    );
  });

  describe('comments', () => {
    it('should throw an error if the comment length is too long', async () => {
      const longComment = Array(MAX_COMMENT_LENGTH + 1)
        .fill('x')
        .toString();

      await expect(
        bulkCreate(
          { attachments: [{ ...comment, comment: longComment }], caseId: 'test-case' },
          clientArgs
        )
      ).rejects.toThrow(
        `Failed while bulk creating attachment to case id: test-case error: Error: The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH}.`
      );
    });

    it('should throw an error if the comment is an empty string', async () => {
      await expect(
        bulkCreate({ attachments: [{ ...comment, comment: '' }], caseId: 'test-case' }, clientArgs)
      ).rejects.toThrow(
        'Failed while bulk creating attachment to case id: test-case error: Error: The comment field cannot be an empty string.'
      );
    });

    it('should throw an error if the description is a string with empty characters', async () => {
      await expect(
        bulkCreate(
          { attachments: [{ ...comment, comment: '  ' }], caseId: 'test-case' },
          clientArgs
        )
      ).rejects.toThrow(
        'Failed while bulk creating attachment to case id: test-case error: Error: The comment field cannot be an empty string.'
      );
    });
  });

  describe('actions', () => {
    it('should throw an error if the comment length is too long', async () => {
      const longComment = Array(MAX_COMMENT_LENGTH + 1)
        .fill('x')
        .toString();

      await expect(
        bulkCreate(
          { attachments: [{ ...actionComment, comment: longComment }], caseId: 'test-case' },
          clientArgs
        )
      ).rejects.toThrow(
        `Failed while bulk creating attachment to case id: test-case error: Error: The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH}.`
      );
    });

    it('should throw an error if the comment is an empty string', async () => {
      await expect(
        bulkCreate(
          { attachments: [{ ...actionComment, comment: '' }], caseId: 'test-case' },
          clientArgs
        )
      ).rejects.toThrow(
        'Failed while bulk creating attachment to case id: test-case error: Error: The comment field cannot be an empty string.'
      );
    });

    it('should throw an error if the description is a string with empty characters', async () => {
      await expect(
        bulkCreate(
          { attachments: [{ ...actionComment, comment: '  ' }], caseId: 'test-case' },
          clientArgs
        )
      ).rejects.toThrow(
        'Failed while bulk creating attachment to case id: test-case error: Error: The comment field cannot be an empty string.'
      );
    });
  });
});
