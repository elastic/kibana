/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable, BehaviorSubject } from 'rxjs';
import { noop } from 'lodash';

import {
  Config,
  ConfigService,
  Env,
  ObjectToConfigAdapter,
} from '../../../../src/core/server/config';
import { mockHttpServer } from '../../../../src/core/server/http/http_service.test.mocks';
import { loggingServiceMock } from '../../../../src/core/server/logging/logging_service.mock';
import { getEnvOptions } from '../../../../src/core/server/config/__mocks__/env';
import { ProxyService, ProxyConfig, ProxyPluginType } from './proxy';

const logger = loggingServiceMock.create();
const env = Env.createDefault(getEnvOptions());

const createConfigService = (value: Partial<ProxyPluginType> = {}) => {
  const conf = Object.assign(
    {
      updateInterval: 0,
      timeoutThreshold: 0,
      port: 0,
      maxRetry: 0,
      requestBackoff: 0,
      cert: '',
      key: '',
      ca: '',
    },
    value
  );
  const cs = new ConfigService(
    new BehaviorSubject<Config>(
      new ObjectToConfigAdapter({
        xpack: {
          proxy: conf,
        },
      })
    ),
    env,
    logger
  );
  cs.setSchema('xpack.proxy', ProxyConfig.schema);
  return cs;
};

function configService(value: Partial<ProxyPluginType>) {
  return {
    create: <ProxyPluginType>() =>
      createConfigService(value).atPath('xpack.proxy') as Observable<ProxyPluginType>,
    createIfExists: <ProxyPluginType>() =>
      createConfigService(value).atPath('xpack.proxy') as Observable<ProxyPluginType>,
  };
}

beforeEach(() => {
  jest.mock('./cluster_doc');
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllMocks();
});

test('creates and sets up proxy server', async () => {
  const httpServer = {
    isListening: () => false,
    setup: jest.fn(),
    start: jest.fn(),
    stop: noop,
  };
  mockHttpServer.mockImplementation(() => httpServer);
  const proxy = new ProxyService({ config: configService({}), env, logger });
});
