/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_SUGGESTED_PROFILES } from '../../../common/constants';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { UserProfileService } from '.';

describe('suggest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws with invalid size field', async () => {
    const mockLogger = loggingSystemMock.createLogger();
    const userProfileService = new UserProfileService(mockLogger);
    await expect(
      // @ts-ignore: irrelevant missing parameters
      userProfileService.suggest({
        body: {
          name: 'antonio',
          owners: [],
          size: MAX_SUGGESTED_PROFILES + 1,
        },
      })
    ).rejects.toThrow(
      `Failed to retrieve suggested user profiles in service: Error: The size field cannot be more than ${MAX_SUGGESTED_PROFILES}.`
    );
  });
});
