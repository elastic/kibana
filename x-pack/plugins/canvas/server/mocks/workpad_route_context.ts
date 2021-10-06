/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CanvasRouteHandlerContext } from '../workpad_route_context';

export interface MockWorkpadRouteContext extends CanvasRouteHandlerContext {
  canvas: {
    workpad: {
      create: jest.Mock;
      get: jest.Mock;
      update: jest.Mock;
      resolve: jest.Mock;
    };
  };
}

export const workpadRouteContextMock = {
  create: (): MockWorkpadRouteContext['canvas'] => ({
    workpad: {
      create: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      resolve: jest.fn(),
    },
  }),
};
