/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AwaitedProperties } from '@kbn/utility-types';
import { CanvasRouteHandlerContext } from '../workpad_route_context';

export interface MockWorkpadRouteContext extends AwaitedProperties<CanvasRouteHandlerContext> {
  canvas: {
    workpad: {
      create: jest.Mock;
      get: jest.Mock;
      import: jest.Mock;
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
      import: jest.fn(),
      update: jest.fn(),
      resolve: jest.fn(),
    },
  }),
};
