/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, KibanaResponseFactory } from '@kbn/core/server';
import { identity } from 'lodash';
import type { MethodKeysOf } from '@kbn/utility-types';
import { httpServerMock } from '@kbn/core/server/mocks';
import { ActionType } from '../../../common';
import { ActionsClientMock, actionsClientMock } from '../../actions_client.mock';
import { ActionsRequestHandlerContext } from '../../types';

export function mockHandlerArguments(
  {
    actionsClient = actionsClientMock.create(),
    listTypes: listTypesRes = [],
  }: { actionsClient?: ActionsClientMock; listTypes?: ActionType[] },
  req: unknown,
  res?: Array<MethodKeysOf<KibanaResponseFactory>>
): [ActionsRequestHandlerContext, KibanaRequest<unknown, unknown, unknown>, KibanaResponseFactory] {
  const listTypes = jest.fn(() => listTypesRes);
  return [
    {
      actions: {
        listTypes,
        getActionsClient() {
          return (
            actionsClient || {
              get: jest.fn(),
              delete: jest.fn(),
              update: jest.fn(),
              find: jest.fn(),
              create: jest.fn(),
            }
          );
        },
      },
    } as unknown as ActionsRequestHandlerContext,
    req as KibanaRequest<unknown, unknown, unknown>,
    mockResponseFactory(res),
  ];
}

export const mockResponseFactory = (resToMock: Array<MethodKeysOf<KibanaResponseFactory>> = []) => {
  const factory: jest.Mocked<KibanaResponseFactory> = httpServerMock.createResponseFactory();
  resToMock.forEach((key: string) => {
    if (key in factory) {
      Object.defineProperty(factory, key, {
        value: jest.fn(identity),
      });
    }
  });
  return factory as unknown as KibanaResponseFactory;
};
