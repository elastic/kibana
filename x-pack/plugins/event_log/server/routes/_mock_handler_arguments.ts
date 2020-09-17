/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { identity, merge } from 'lodash';
import { RequestHandlerContext, KibanaRequest, KibanaResponseFactory } from 'src/core/server';

import { httpServerMock } from 'src/core/server/mocks';
import { IEventLogClient } from '../types';

export function mockHandlerArguments(
  eventLogClient: IEventLogClient,
  req: unknown,
  res?: Array<MethodKeysOf<KibanaResponseFactory>>
): [RequestHandlerContext, KibanaRequest<unknown, unknown, unknown>, KibanaResponseFactory] {
  return [
    ({
      eventLog: {
        getEventLogClient() {
          return eventLogClient;
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

export function fakeEvent(overrides = {}) {
  return merge(
    {
      event: {
        provider: 'actions',
        action: 'execute',
        start: '2020-03-30T14:55:47.054Z',
        end: '2020-03-30T14:55:47.055Z',
        duration: 1000000,
      },
      kibana: {
        saved_objects: [
          {
            namespace: 'default',
            type: 'action',
            id: '968f1b82-0414-4a10-becc-56b6473e4a29',
          },
        ],
        server_uuid: '5b2de169-2785-441b-ae8c-186a1936b17d',
      },
      message: 'action executed: .server-log:968f1b82-0414-4a10-becc-56b6473e4a29: logger',
      '@timestamp': '2020-03-30T14:55:47.055Z',
      ecs: {
        version: '1.3.1',
      },
    },
    overrides
  );
}
