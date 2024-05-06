/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { requestContextMock } from './request_context';
export { requestMock } from './request';
export { responseMock } from './response_factory';
export { serverMock } from './server';
export { configMock, createMockConfig } from '../../../../config.mock';

export const mockGetCurrentUser = {
  user: {
    username: 'mockUser',
  },
};
