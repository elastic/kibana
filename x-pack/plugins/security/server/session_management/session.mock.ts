/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { mockAuthenticatedUser } from '../../common/model/authenticated_user.mock';
import { Session, SessionValue } from './session';
import { SessionIndexValue } from './session_index';
import { SessionCookieValue } from './session_cookie';

const createSessionIndexValue = (
  sessionValue: Partial<SessionIndexValue> = {}
): SessionIndexValue => ({
  sid: 'some-long-sid',
  username_hash: 'some-username-hash',
  provider: { type: 'basic', name: 'basic1' },
  idleTimeoutExpiration: null,
  lifespanExpiration: null,
  path: '/',
  content: 'some-encrypted-content',
  metadata: { primaryTerm: 1, sequenceNumber: 1 },
  ...sessionValue,
});

const createSessionCookieValue = (
  sessionValue: Partial<SessionCookieValue> = {}
): SessionCookieValue => ({
  sid: 'some-long-sid',
  aad: 'some-aad',
  idleTimeoutExpiration: null,
  lifespanExpiration: null,
  path: '/',
  ...sessionValue,
});

export const sessionMock = {
  create: (): jest.Mocked<PublicMethodsOf<Session>> => ({
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    extend: jest.fn(),
    clear: jest.fn(),
  }),

  createSessionValue: (sessionValue: Partial<SessionValue> = {}): SessionValue => ({
    sid: 'some-long-sid',
    username: mockAuthenticatedUser().username,
    provider: { type: 'basic', name: 'basic1' },
    idleTimeoutExpiration: null,
    lifespanExpiration: null,
    path: '/',
    state: undefined,
    metadata: { index: createSessionIndexValue(sessionValue.metadata?.index) },
    ...sessionValue,
  }),

  createSessionIndexValue,
  createSessionCookieValue,
};
