/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { comment, actionComment } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import {
  MAX_COMMENT_LENGTH,
  MAX_BULK_CREATE_ATTACHMENTS,
  MAX_USER_ACTIONS_PER_CASE,
} from '../../../common/constants';
import { bulkCreate } from './bulk_create';
import { createUserActionServiceMock } from '../../services/mocks';

describe('bulkCreate', () => {
  const caseId = 'test-case';

  const clientArgs = createCasesClientMockArgs();
  const userActionService = createUserActionServiceMock();

  clientArgs.services.userActionService = userActionService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws with excess fields', async () => {
    await expect(
      // @ts-expect-error: excess attribute
      bulkCreate({ attachments: [{ ...comment, foo: 'bar' }], caseId }, clientArgs)
    ).rejects.toThrow('invalid keys "foo"');
  });

  it(`throws error when attachments are more than ${MAX_BULK_CREATE_ATTACHMENTS}`, async () => {
    const attachments = Array(MAX_BULK_CREATE_ATTACHMENTS + 1).fill(comment);

    await expect(bulkCreate({ attachments, caseId }, clientArgs)).rejects.toThrow(
      `The length of the field attachments is too long. Array must be of length <= ${MAX_BULK_CREATE_ATTACHMENTS}.`
    );
  });

  it(`throws error when the case user actions become > ${MAX_USER_ACTIONS_PER_CASE}`, async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
      [caseId]: MAX_USER_ACTIONS_PER_CASE - 1,
    });

    await expect(
      bulkCreate({ attachments: [comment, comment], caseId }, clientArgs)
    ).rejects.toThrow(
      `The case with id ${caseId} has reached the limit of ${MAX_USER_ACTIONS_PER_CASE} user actions.`
    );
  });

  describe('comments', () => {
    it('should throw an error if the comment length is too long', async () => {
      const longComment = Array(MAX_COMMENT_LENGTH + 1)
        .fill('x')
        .toString();

      await expect(
        bulkCreate({ attachments: [{ ...comment, comment: longComment }], caseId }, clientArgs)
      ).rejects.toThrow(
        `Failed while bulk creating attachment to case id: test-case error: Error: The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH}.`
      );
    });

    it('should throw an error if the comment is an empty string', async () => {
      await expect(
        bulkCreate({ attachments: [{ ...comment, comment: '' }], caseId }, clientArgs)
      ).rejects.toThrow(
        'Failed while bulk creating attachment to case id: test-case error: Error: The comment field cannot be an empty string.'
      );
    });

    it('should throw an error if the description is a string with empty characters', async () => {
      await expect(
        bulkCreate({ attachments: [{ ...comment, comment: '  ' }], caseId }, clientArgs)
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
          { attachments: [{ ...actionComment, comment: longComment }], caseId },
          clientArgs
        )
      ).rejects.toThrow(
        `Failed while bulk creating attachment to case id: test-case error: Error: The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH}.`
      );
    });

    it('should throw an error if the comment is an empty string', async () => {
      await expect(
        bulkCreate({ attachments: [{ ...actionComment, comment: '' }], caseId }, clientArgs)
      ).rejects.toThrow(
        'Failed while bulk creating attachment to case id: test-case error: Error: The comment field cannot be an empty string.'
      );
    });

    it('should throw an error if the description is a string with empty characters', async () => {
      await expect(
        bulkCreate({ attachments: [{ ...actionComment, comment: '  ' }], caseId }, clientArgs)
      ).rejects.toThrow(
        'Failed while bulk creating attachment to case id: test-case error: Error: The comment field cannot be an empty string.'
      );
    });
  });
});
