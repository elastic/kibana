/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EndpointCasesServiceInterface } from './types';

export const getEndpointCasesServiceMock = (): jest.Mocked<EndpointCasesServiceInterface> => {
  return {
    update: jest.fn(async (_) => undefined),
  };
};
