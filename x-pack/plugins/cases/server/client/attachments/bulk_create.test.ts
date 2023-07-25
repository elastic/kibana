/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { comment, actionComment } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { MAX_COMMENT_LENGTH, MAX_BULK_CREATE_ATTACHMENTS } from '../../../common/constants';
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

  it(`throws error when attachments are more than ${MAX_BULK_CREATE_ATTACHMENTS}`, async () => {
    const attachments = Array(MAX_BULK_CREATE_ATTACHMENTS + 1).fill(comment);

    await expect(bulkCreate({ attachments, caseId: 'test-case' }, clientArgs)).rejects.toThrow(
      `The length of the field attachments is too long. Array must be of length <= ${MAX_BULK_CREATE_ATTACHMENTS}.`
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
