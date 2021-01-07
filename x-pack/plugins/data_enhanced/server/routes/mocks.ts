/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'kibana/server';
import { coreMock } from '../../../../../src/core/server/mocks';

export function createSearchRequestHandlerContext() {
  return ({
    core: coreMock.createRequestHandlerContext(),
    search: {
      search: jest.fn(),
      cancel: jest.fn(),
      session: {
        search: jest.fn(),
        save: jest.fn(),
        get: jest.fn(),
        find: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
    },
  } as unknown) as jest.Mocked<RequestHandlerContext>;
}
