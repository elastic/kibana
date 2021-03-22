/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, KibanaResponseFactory } from 'kibana/server';
import { identity } from 'lodash';
import type { MethodKeysOf } from '@kbn/utility-types';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { ScopedClusterClientMock } from '../../../../../src/core/server/elasticsearch/client/mocks';
import { httpServerMock } from '../../../../../src/core/server/mocks';
import { alertsClientMock, AlertsClientMock } from '../alerts_client.mock';
import { AlertsHealth, AlertType } from '../../common';
import { elasticsearchServiceMock } from '../../../../../src/core/server/mocks';
import type { AlertingRequestHandlerContext } from '../types';

export function mockHandlerArguments(
  {
    alertsClient = alertsClientMock.create(),
    listTypes: listTypesRes = [],
    esClient = elasticsearchServiceMock.createScopedClusterClient(),
    getFrameworkHealth,
  }: {
    alertsClient?: AlertsClientMock;
    listTypes?: AlertType[];
    esClient?: jest.Mocked<ScopedClusterClientMock>;
    getFrameworkHealth?: jest.MockInstance<Promise<AlertsHealth>, []> &
      (() => Promise<AlertsHealth>);
  },
  req: unknown,
  res?: Array<MethodKeysOf<KibanaResponseFactory>>
): [
  AlertingRequestHandlerContext,
  KibanaRequest<unknown, unknown, unknown>,
  KibanaResponseFactory
] {
  const listTypes = jest.fn(() => listTypesRes);
  return [
    ({
      core: { elasticsearch: { client: esClient } },
      alerting: {
        listTypes,
        getAlertsClient() {
          return alertsClient || alertsClientMock.create();
        },
        getFrameworkHealth,
      },
    } as unknown) as AlertingRequestHandlerContext,
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
