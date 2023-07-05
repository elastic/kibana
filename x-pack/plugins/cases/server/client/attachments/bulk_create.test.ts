/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_ADD_COMMENTS } from '../../../common/constants';
import { comment } from '../../mocks';
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

  it('throws when trying to add too many attachments', async () => {
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

  it('throws when trying to add zero attachments', async () => {
    await expect(
      bulkCreate(
        {
          attachments: [],
          caseId: 'test-case',
        },
        clientArgs
      )
    ).rejects.toThrow(
      'Failed while bulk creating attachment to case id: test-case error: Error: The length of the field attachments is too short. Array must be of length >= 1.'
    );
  });
});
