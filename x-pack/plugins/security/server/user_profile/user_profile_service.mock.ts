/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileServiceStart } from '.';
import { userProfileMock } from '../../common/model/user_profile.mock';

export const userProfileServiceMock = {
  createStart: (): jest.Mocked<UserProfileServiceStart> => ({
    activate: jest.fn().mockReturnValue(userProfileMock.create()),
    get: jest.fn(),
    update: jest.fn(),
  }),
};
