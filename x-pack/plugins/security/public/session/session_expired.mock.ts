/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISessionExpired } from './session_expired';

export function createSessionExpiredMock() {
  return {
    logout: jest.fn(),
  } as jest.Mocked<ISessionExpired>;
}
