/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  RequestHandlerContext,
  KibanaRequest,
  KibanaResponseFactory,
  ILegacyClusterClient,
} from 'kibana/server';
import { identity } from 'lodash';
import { httpServerMock } from '../../../../../src/core/server/mocks';
import { alertsClientMock, AlertsClientMock } from '../alerts_client.mock';
import { AlertType } from '../../common';
import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';

export function mockHandlerArguments(
  {
    alertsClient = alertsClientMock.create(),
    listTypes: listTypesRes = [],
    esClient = elasticsearchServiceMock.createLegacyClusterClient(),
  }: {
    alertsClient?: AlertsClientMock;
    listTypes?: AlertType[];
    esClient?: jest.Mocked<ILegacyClusterClient>;
  },
  req: unknown,
  res?: Array<MethodKeysOf<KibanaResponseFactory>>
): [RequestHandlerContext, KibanaRequest<unknown, unknown, unknown>, KibanaResponseFactory] {
  const listTypes = jest.fn(() => listTypesRes);
  return [
    ({
      core: { elasticsearch: { legacy: { client: esClient } } },
      alerting: {
        listTypes,
        getAlertsClient() {
          return alertsClient || alertsClientMock.create();
        },
      },
    } as unknown) as RequestHandlerContext,
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
  return (factory as unknown) as KibanaResponseFactory;
};
