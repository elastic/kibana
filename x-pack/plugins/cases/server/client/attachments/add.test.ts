/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { comment } from '../../mocks';
import { createCasesClientMockArgs } from '../mocks';
import { MAX_COMMENT_LENGTH } from '../../../common/constants';
import { addComment } from './add';

describe('addComment', () => {
  const clientArgs = createCasesClientMockArgs();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws with excess fields', async () => {
    await expect(
      // @ts-expect-error: excess attribute
      addComment({ comment: { ...comment, foo: 'bar' }, caseId: 'test-case' }, clientArgs)
    ).rejects.toThrow('invalid keys "foo"');
  });

  it('should throw an error if the comment length is too long', async () => {
    const longComment = 'x'.repeat(MAX_COMMENT_LENGTH + 1);

    await expect(
      addComment({ comment: { ...comment, comment: longComment }, caseId: 'test-case' }, clientArgs)
    ).rejects.toThrow(
      `Failed while adding a comment to case id: test-case error: Error: The length of the comment is too long. The maximum length is ${MAX_COMMENT_LENGTH}.`
    );
  });

  it('should throw an error if the comment is an empty string', async () => {
    await expect(
      addComment({ comment: { ...comment, comment: '' }, caseId: 'test-case' }, clientArgs)
    ).rejects.toThrow(
      'Failed while adding a comment to case id: test-case error: Error: The comment field cannot be an empty string.'
    );
  });

  it('should throw an error if the description is a string with empty characters', async () => {
    await expect(
      addComment({ comment: { ...comment, comment: '  ' }, caseId: 'test-case' }, clientArgs)
    ).rejects.toThrow(
      'Failed while adding a comment to case id: test-case error: Error: The comment field cannot be an empty string.'
    );
  });
});
