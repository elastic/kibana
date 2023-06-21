/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';

import type { SessionIndex, SessionIndexValue } from './session_index';

export const sessionIndexMock = {
  create: (): jest.Mocked<PublicMethodsOf<SessionIndex>> => ({
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    invalidate: jest.fn(),
    initialize: jest.fn(),
    cleanUp: jest.fn(),
    isWithinConcurrentSessionLimit: jest.fn().mockResolvedValue(true),
  }),

  createValue: (sessionValue: Partial<SessionIndexValue> = {}): SessionIndexValue => ({
    sid: 'some-long-sid',
    usernameHash: 'some-username-hash',
    provider: { type: 'basic', name: 'basic1' },
    idleTimeoutExpiration: null,
    lifespanExpiration: null,
    createdAt: 1234567890,
    content: 'some-encrypted-content',
    metadata: { primaryTerm: 1, sequenceNumber: 1 },
    ...sessionValue,
  }),
};
