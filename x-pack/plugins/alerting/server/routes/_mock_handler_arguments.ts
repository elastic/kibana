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
import { rulesClientMock, RulesClientMock } from '../rules_client.mock';
import { AlertsHealth, RuleType } from '../../common';
import type { AlertingRequestHandlerContext } from '../types';

export function mockHandlerArguments(
  {
    rulesClient = rulesClientMock.create(),
    listTypes: listTypesRes = [],
    getFrameworkHealth,
    areApiKeysEnabled,
  }: {
    rulesClient?: RulesClientMock;
    listTypes?: RuleType[];
    getFrameworkHealth?: jest.MockInstance<Promise<AlertsHealth>, []> &
      (() => Promise<AlertsHealth>);
    areApiKeysEnabled?: () => Promise<boolean>;
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
    {
      alerting: {
        listTypes,
        getRulesClient() {
          return rulesClient || rulesClientMock.create();
        },
        getFrameworkHealth,
        areApiKeysEnabled: areApiKeysEnabled ? areApiKeysEnabled : () => Promise.resolve(true),
      },
    } as unknown as AlertingRequestHandlerContext,
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
