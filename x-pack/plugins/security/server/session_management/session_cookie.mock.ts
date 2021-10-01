/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';

import type { SessionCookie, SessionCookieValue } from './session_cookie';

export const sessionCookieMock = {
  create: (): jest.Mocked<PublicMethodsOf<SessionCookie>> => ({
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
  }),

  createValue: (sessionValue: Partial<SessionCookieValue> = {}): SessionCookieValue => ({
    sid: 'some-long-sid',
    aad: 'some-aad',
    idleTimeoutExpiration: null,
    lifespanExpiration: null,
    path: '/mock-base-path',
    ...sessionValue,
  }),
};
