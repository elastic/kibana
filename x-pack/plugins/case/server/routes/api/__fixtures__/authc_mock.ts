/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Authentication } from '../../../../../security/server';

const getCurrentUser = jest.fn().mockReturnValue({
  username: 'awesome',
  full_name: 'Awesome D00d',
});
const getCurrentUserThrow = jest.fn().mockImplementation(() => {
  throw new Error('Bad User - the user is not authenticated');
});

export const authenticationMock = {
  create: (): jest.Mocked<Authentication> => ({
    login: jest.fn(),
    createAPIKey: jest.fn(),
    getCurrentUser,
    invalidateAPIKey: jest.fn(),
    isAuthenticated: jest.fn(),
    logout: jest.fn(),
    getSessionInfo: jest.fn(),
  }),
  createInvalid: (): jest.Mocked<Authentication> => ({
    login: jest.fn(),
    createAPIKey: jest.fn(),
    getCurrentUser: getCurrentUserThrow,
    invalidateAPIKey: jest.fn(),
    isAuthenticated: jest.fn(),
    logout: jest.fn(),
    getSessionInfo: jest.fn(),
  }),
};
