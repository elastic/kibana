/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { Observable, BehaviorSubject } from 'rxjs';

import { ClusterDocClient, RouteState } from './cluster_doc';
import {
  Config,
  ConfigService,
  Env,
  ObjectToConfigAdapter,
} from '../../../../src/core/server/config';
import { loggingServiceMock } from '../../../../src/core/server/logging/logging_service.mock';
import { elasticsearchServiceMock } from '../../../../src/core/server/elasticsearch/elasticsearch_service.mock';
import { getEnvOptions } from '../../../../src/core/server/config/__mocks__/env';
import { ProxyConfig, ProxyPluginType } from './proxy';

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

test('initial run of main loop works', async () => {
  const esClients = {
    adminClient: {},
    dataClient: {
      callAsInternalUser: jest.fn<Promise<any>, any>(async () => ({ _source: {} })),
    },
  };
  const elasticClient = elasticsearchServiceMock.createSetupContract(esClients);
  const config = configService({
    updateInterval: 100,
    timeoutThreshold: 100,
  });
  const clusterDoc = new ClusterDocClient({ config, env, logger });

  try {
    await clusterDoc.setup(elasticClient);
    await clusterDoc.start();
    await clusterDoc.stop();
  } catch (err) {
    expect(err).toBeFalsy();
  }

  expect(setTimeout).toHaveBeenCalledTimes(1);
  expect(esClients.dataClient.callAsInternalUser.mock.calls[0][0]).toBe('get');
  expect(esClients.dataClient.callAsInternalUser.mock.calls[1][0]).toBe('index');
  const nodeList = esClients.dataClient.callAsInternalUser.mock.calls[1][1].body;
  const nodeKeys = Object.keys(nodeList.nodes);
  expect(nodeList.routing_table).toMatchObject({});
  expect(nodeKeys.length).toBe(1);
  expect(nodeList.nodes[nodeKeys[0]].lastUpdate).not.toBe(0);
  expect(nodeList.nodes[nodeKeys[0]].lastUpdate).toBeLessThan(new Date().getTime());
});

test('removes stale nodes, keeps good nodes', async () => {
  const mockESReply = {
    _source: {
      nodes: {
        '073fb287-161c-49f3-976d-1e507575e354': {
          lastUpdate: 100,
        },
        'd4fa4018-8510-420c-aa99-d6d722792b3c': {
          lastUpdate: new Date().getTime(),
        },
      },
      routing_table: {
        resource1: {
          type: 'code',
          node: '073fb287-161c-49f3-976d-1e507575e354',
          state: RouteState.Started,
        },
        resource2: {
          type: 'code',
          node: 'd4fa4018-8510-420c-aa99-d6d722792b3c',
          state: RouteState.Started,
        },
      },
    },
  };

  const esClients = {
    adminClient: {},
    dataClient: {
      callAsInternalUser: jest.fn<Promise<any>, any>(async () => mockESReply),
    },
  };
  const elasticClient = elasticsearchServiceMock.createSetupContract(esClients);
  const config = configService({
    updateInterval: 100,
    timeoutThreshold: 100,
  });
  const clusterDoc = new ClusterDocClient({ config, env, logger });

  try {
    await clusterDoc.setup(elasticClient);
    await clusterDoc.start();
  } catch (err) {
    expect(err).toBeFalsy();
  }

  const nodeList = esClients.dataClient.callAsInternalUser.mock.calls[1][1].body;
  const nodeKeys = Object.keys(nodeList.nodes);

  expect(nodeList.routing_table).toEqual({
    resource2: mockESReply._source.routing_table.resource2,
  });
  expect(nodeKeys.length).toBe(2);
  expect(nodeKeys.includes('073fb287-161c-49f3-976d-1e507575e354')).toBeFalsy();
  expect(nodeKeys.includes('d4fa4018-8510-420c-aa99-d6d722792b3c')).toBeTruthy();
  expect(nodeKeys.includes(clusterDoc.nodeName)).toBeTruthy();
  expect(nodeList.nodes[nodeKeys[0]].lastUpdate).not.toBe(100);
  expect(nodeList.nodes[nodeKeys[0]].lastUpdate).toBeLessThan(new Date().getTime());

  await clusterDoc.stop();
});

test('assign and unassign resource', async () => {
  const esClients = {
    adminClient: {},
    dataClient: {
      callAsInternalUser: jest.fn<Promise<any>, any>(async () => ({ _source: {} })),
    },
  };
  const elasticClient = elasticsearchServiceMock.createSetupContract(esClients);
  const config = configService({
    updateInterval: 100,
    timeoutThreshold: 100,
  });
  const clusterDoc = new ClusterDocClient({ config, env, logger });

  try {
    await clusterDoc.setup(elasticClient);
    await clusterDoc.start();
  } catch (err) {
    expect(err).toBeFalsy();
  }

  await clusterDoc.assignResource('/foo/bar', 'code', RouteState.Started);
  const nodeList = esClients.dataClient.callAsInternalUser.mock.calls[3][1];
  const expected = {
    '/foo/bar': {
      type: 'code',
      state: 1,
      node: clusterDoc.nodeName,
    },
  };
  expect(nodeList.body.routing_table).toEqual(expected);

  try {
    await clusterDoc.assignResource('/foo/bar', 'code', RouteState.Started);
  } catch (err) {
    expect(err.message).toBe(`/foo/bar already exists on ${clusterDoc.nodeName}`);
  }

  await clusterDoc.unassignResource('/foo/bar');
  const nodeList2 = esClients.dataClient.callAsInternalUser.mock.calls[5][1];
  expect(nodeList2.body.routing_table).toEqual({});

  await clusterDoc.stop();
});

test('honeybadgers on conflicts', async () => {
  const esClients = {
    adminClient: {},
    dataClient: {
      callAsInternalUser: jest.fn<Promise<any>, any>(async method => {
        if (method === 'get') {
          return { _source: {} };
        }
        const err = Boom.boomify(new Error('foo'), { statusCode: 409 });
        throw err;
      }),
    },
  };
  const elasticClient = elasticsearchServiceMock.createSetupContract(esClients);
  const config = configService({
    updateInterval: 100,
    timeoutThreshold: 100,
  });
  const clusterDoc = new ClusterDocClient({ config, env, logger });

  try {
    await clusterDoc.setup(elasticClient);
    await clusterDoc.start();
  } catch (err) {}

  expect(setTimeout).toHaveBeenCalledTimes(1);
  try {
    await clusterDoc.stop();
  } catch (err) {
    expect(err.output.statusCode).toBe(409);
  }
});
