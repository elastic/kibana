/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SessionService } from '.';

export const createMock = (): PublicMethodsOf<SessionService> => {
  return {
    trackId: jest.fn(),
    getId: jest.fn(),
    get: jest.fn(),
    store: jest.fn(),
    destroy: jest.fn(),
  };
};
