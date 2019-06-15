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
import { httpServiceMock } from '../../../../src/core/server/http/http_service.mock';
import { loggingServiceMock } from '../../../../src/core/server/logging/logging_service.mock';
import { getEnvOptions } from '../../../../src/core/server/config/__mocks__/env';
import { elasticsearchServiceMock } from '../../../../src/core/server/elasticsearch/elasticsearch_service.mock';
import { httpServerMock } from '../../../../src/core/server/http/http_server.mocks';
import { KibanaRequest } from '../../../../src/core/server/http/router/request';

const mockWreck = {
  request: jest.fn(),
};

jest.mock('wreck', () => ({
  defaults: () => mockWreck,
  read: jest.fn(),
}));

import { mockReadFile } from './fs.mock';
import { mockClusterDocClient } from './cluster_doc.test.mock';
import { ProxyService, ProxyConfig, ProxyPluginType } from './proxy';
import { RouteState } from './cluster_doc';

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
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllMocks();
});

test('creates and sets up proxy server', async () => {
  const clusterDocClient = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: noop,
  };

  mockClusterDocClient.mockImplementation(() => clusterDocClient);
  const elasticClient = elasticsearchServiceMock.createSetupContract();
  const httpService = httpServiceMock.createSetupContract();

  const core = {
    elasticsearch: elasticClient,
    http: httpService,
  };

  mockReadFile.mockImplementation((x, cb) => cb(null, Buffer.from('foo')));

  const proxy = new ProxyService({ config: configService({}), env, logger });
  await proxy.setup(core, {});

  expect(clusterDocClient.setup.mock.calls.length).toBe(1);
  expect(httpService.createNewServer.mock.calls.length).toBe(1);
  expect(mockReadFile.mock.calls.length).toBe(3);
  const passedConfig = httpService.createNewServer.mock.calls[0][0];
  expect(passedConfig.ssl).toBeTruthy();
  expect(passedConfig.ssl.certificate).toBe('foo');

  const proxyStart = await proxy.start();

  expect(clusterDocClient.start.mock.calls.length).toBe(1);
  expect(proxyStart).toBeTruthy();

  await proxy.stop();
});

test('handles allocate and unallocate', async () => {
  const clusterDocClient = {
    setup: jest.fn(),
    start: jest.fn(),
    assignResource: jest.fn(),
    unassignResource: jest.fn(),
    stop: noop,
  };

  mockClusterDocClient.mockImplementation(() => clusterDocClient);
  const elasticClient = elasticsearchServiceMock.createSetupContract();
  const httpService = httpServiceMock.createSetupContract();

  const core = {
    elasticsearch: elasticClient,
    http: httpService,
  };

  mockReadFile.mockImplementation((x, cb) => cb(null, Buffer.from('foo')));

  const proxy = new ProxyService({ config: configService({}), env, logger });
  await proxy.setup(core, {});
  const proxyStart = await proxy.start();
  await proxyStart.assignResource('/foo/bar', 'code', RouteState.Started, proxy.nodeName);
  await proxyStart.unassignResource('/foo/bar');
  expect(clusterDocClient.assignResource.mock.calls.length).toBe(1);
  expect(clusterDocClient.unassignResource.mock.calls.length).toBe(1);

  await proxy.stop();
});

test('proxy resource', async () => {
  const clusterDocClient = {
    setup: jest.fn(),
    start: jest.fn(),
    assignResource: jest.fn(),
    unassignResource: jest.fn(),
    getNodeForResource: jest.fn(() => ({
      type: 'code',
      state: RouteState.Started,
      node: 'beep',
    })),
    stop: noop,
  };

  mockClusterDocClient.mockImplementation(() => clusterDocClient);
  const elasticClient = elasticsearchServiceMock.createSetupContract();
  const httpService = httpServiceMock.createSetupContract();

  const core = {
    elasticsearch: elasticClient,
    http: httpService,
  };

  mockReadFile.mockImplementation((x, cb) => cb(null, Buffer.from('foo')));

  const proxy = new ProxyService({ config: configService({}), env, logger });
  await proxy.setup(core, {});
  const proxyStart = await proxy.start();
  await proxyStart.assignResource('/foo/bar', 'code', RouteState.Started, proxy.nodeName);
  const agent = proxyStart.proxyResource('/foo/bar');
  const r = httpServerMock.createRawRequest({
    headers: {},
    url: new URL('https://beep/foo/bar'),
    path: '/foo/bar',
    method: 'get',
  });
  const req = KibanaRequest.from(r);

  await agent(req);
  expect(clusterDocClient.getNodeForResource.mock.calls.length).toBe(1);
  expect(mockWreck.request.mock.calls.length).toBe(1);

  await proxyStart.proxyRequest(req, '/foo/bar');
  expect(clusterDocClient.getNodeForResource.mock.calls.length).toBe(2);
  expect(mockWreck.request.mock.calls.length).toBe(2);
  await proxy.stop();
});
