/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext, KibanaRequest, KibanaResponseFactory } from 'kibana/server';
import { identity } from 'lodash';
import { httpServerMock } from '../../../../../src/core/server/mocks';
import { alertsClientMock } from '../alerts_client.mock';

export function mockHandlerArguments(
  { alertsClient, listTypes: listTypesRes = [] }: any,
  req: any,
  res?: Array<MethodKeysOf<KibanaResponseFactory>>
): [RequestHandlerContext, KibanaRequest<any, any, any, any>, KibanaResponseFactory] {
  const listTypes = jest.fn(() => listTypesRes);
  return [
    ({
      alerting: {
        listTypes,
        getAlertsClient() {
          return alertsClient || alertsClientMock.create();
        },
      },
    } as unknown) as RequestHandlerContext,
    req as KibanaRequest<any, any, any, any>,
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
  return (factory as unknown) as KibanaResponseFactory;
};
