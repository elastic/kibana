/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';

import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';
import type { Session, SessionValue } from './session';
import { SessionMissingError } from './session_errors';
import { sessionIndexMock } from './session_index.mock';

export const sessionMock = {
  create: (): jest.Mocked<PublicMethodsOf<Session>> => ({
    getSID: jest.fn(),
    get: jest.fn().mockResolvedValue({ error: new SessionMissingError(), value: null }),
    create: jest.fn(),
    update: jest.fn(),
    extend: jest.fn(),
    invalidate: jest.fn(),
  }),

  createValue: (sessionValue: Partial<SessionValue> = {}): SessionValue => ({
    sid: 'some-long-sid',
    username: mockAuthenticatedUser().username,
    userProfileId: 'uid',
    provider: { type: 'basic', name: 'basic1' },
    idleTimeoutExpiration: null,
    lifespanExpiration: null,
    createdAt: 1234567890,
    state: undefined,
    metadata: { index: sessionIndexMock.createValue(sessionValue.metadata?.index) },
    ...sessionValue,
  }),
};
