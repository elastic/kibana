/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requestContextMock } from './lib/detection_engine/routes/__mocks__';
import { IRequestContextFactory } from './request_context_factory';

export const requestContextFactoryMock = {
  create: (): jest.Mocked<IRequestContextFactory> => ({
    create: jest.fn((context, request) => {
      const fullContext = requestContextMock.create();
      const securitySolutionContext = fullContext.securitySolution;
      return Promise.resolve(securitySolutionContext);
    }),
  }),
};

export const RequestContextFactoryMock = jest
  .fn<jest.Mocked<IRequestContextFactory>, []>()
  .mockImplementation(requestContextFactoryMock.create);
