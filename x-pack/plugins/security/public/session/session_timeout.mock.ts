/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISessionTimeout } from './session_timeout';

export function createSessionTimeoutMock() {
  return {
    start: jest.fn(),
    stop: jest.fn(),
    extend: jest.fn(),
  } as jest.Mocked<ISessionTimeout>;
}
