/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SessionIndex, SessionIndexValue } from './session_index';

export const sessionIndexMock = {
  create: (): jest.Mocked<PublicMethodsOf<SessionIndex>> => ({
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    clear: jest.fn(),
    initialize: jest.fn(),
    cleanUp: jest.fn(),
  }),

  createValue: (sessionValue: Partial<SessionIndexValue> = {}): SessionIndexValue => ({
    sid: 'some-long-sid',
    usernameHash: 'some-username-hash',
    provider: { type: 'basic', name: 'basic1' },
    idleTimeoutExpiration: null,
    lifespanExpiration: null,
    content: 'some-encrypted-content',
    metadata: { primaryTerm: 1, sequenceNumber: 1 },
    ...sessionValue,
  }),
};
