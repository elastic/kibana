/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_COMMENT_LENGTH, MAX_USER_ACTIONS_PER_CASE } from '../../../common/constants';
import { comment } from '../../mocks';
import { createUserActionServiceMock } from '../../services/mocks';
import { createCasesClientMockArgs } from '../mocks';
import { addComment } from './add';

describe('addComment', () => {
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
      addComment({ comment: { ...comment, foo: 'bar' }, caseId }, clientArgs)
    ).rejects.toThrow('invalid keys "foo"');
  });

  it('should throw an error if the comment length is too long', async () => {
    const longComment = 'x'.repeat(MAX_COMMENT_LENGTH + 1);

    await expect(
      addComment({ comment: { ...comment, comment: longComment }, caseId }, clientArgs)
    ).rejects.toThrow(
      `Failed while adding a comment to case id: test-case error: Error: The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH}.`
    );
  });

  it('should throw an error if the comment is an empty string', async () => {
    await expect(
      addComment({ comment: { ...comment, comment: '' }, caseId }, clientArgs)
    ).rejects.toThrow(
      'Failed while adding a comment to case id: test-case error: Error: The comment field cannot be an empty string.'
    );
  });

  it('should throw an error if the description is a string with empty characters', async () => {
    await expect(
      addComment({ comment: { ...comment, comment: '  ' }, caseId }, clientArgs)
    ).rejects.toThrow(
      'Failed while adding a comment to case id: test-case error: Error: The comment field cannot be an empty string.'
    );
  });

  it(`throws error when the case user actions become > ${MAX_USER_ACTIONS_PER_CASE}`, async () => {
    userActionService.getMultipleCasesUserActionsTotal.mockResolvedValue({
      [caseId]: MAX_USER_ACTIONS_PER_CASE,
    });

    await expect(addComment({ comment, caseId }, clientArgs)).rejects.toThrow(
      `The case with id ${caseId} has reached the limit of ${MAX_USER_ACTIONS_PER_CASE} user actions.`
    );
  });
});
