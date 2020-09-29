/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';
import { Session, SessionValue } from './session';
import { sessionIndexMock } from './session_index.mock';

export const sessionMock = {
  create: (): jest.Mocked<PublicMethodsOf<Session>> => ({
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    extend: jest.fn(),
    clear: jest.fn(),
  }),

  createValue: (sessionValue: Partial<SessionValue> = {}): SessionValue => ({
    sid: 'some-long-sid',
    username: mockAuthenticatedUser().username,
    provider: { type: 'basic', name: 'basic1' },
    idleTimeoutExpiration: null,
    lifespanExpiration: null,
    state: undefined,
    metadata: { index: sessionIndexMock.createValue(sessionValue.metadata?.index) },
    ...sessionValue,
  }),
};
