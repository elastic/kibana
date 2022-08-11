/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/server/mocks';
import { createFleetRequestHandlerContextMock } from '@kbn/fleet-plugin/server/mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';

function createCoreRequestHandlerContextMock() {
  return {
    core: coreMock.createRequestHandlerContext(),
    licensing: licensingMock.createRequestHandlerContext(),
    fleet: createFleetRequestHandlerContextMock(),
  };
}

export const xpackMocks = {
  createRequestHandlerContext: createCoreRequestHandlerContextMock,
};
