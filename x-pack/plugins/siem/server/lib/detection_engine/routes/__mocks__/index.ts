/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { requestContextMock } from './request_context';
import { serverMock } from './server';
import { requestMock } from './request';
import { responseMock } from './response_factory';

export { requestMock, requestContextMock, responseMock, serverMock };

export const createMockConfig = () => () => ({
  get: jest.fn(),
  has: jest.fn(),
});
