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
import {
  unassignResource,
  updateHeartbeat,
  removeHeartbeat,
  cullDeadResources,
  cullDeadNodes,
} from './painless-queries';
import { JsonLayout } from '../../../../src/core/server/logging/layouts/json_layout';

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

xtest('initial run of main loop works', async () => {
  const esClients = {
    adminClient: {},
    dataClient: {
      callAsInternalUser: jest.fn<Promise<any>, any>(async function() {
        return { _source: {} };
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
    await clusterDoc.stop();
  } catch (err) {
    expect(err).toBeFalsy();
  }

  expect(setTimeout).toHaveBeenCalledTimes(1);
  expect(esClients.dataClient.callAsInternalUser.mock.calls[0][0]).toBe('update');
  expect(esClients.dataClient.callAsInternalUser.mock.calls[1][0]).toBe('get');
  expect(esClients.dataClient.callAsInternalUser.mock.calls[2][0]).toBe('update');
  // 2 calls per "loop", 1 call on "stop"
  expect(esClients.dataClient.callAsInternalUser).toHaveBeenCalledTimes(3);
  const update = esClients.dataClient.callAsInternalUser.mock.calls[0][1].body.script;
  const remove = esClients.dataClient.callAsInternalUser.mock.calls[2][1].body.script;
  expect(update).toBe(updateHeartbeat);
  expect(remove).toBe(removeHeartbeat);
});

test('removes stale nodes, keeps good nodes', async () => {
  const nodeName = 'd4fa4018-8510-420c-aa99-d6d722792b3c';
  const mockHeartbeatReply = {
    _source: {
      '073fb287-161c-49f3-976d-1e507575e354': 1, // this node will be culled
      [nodeName]: 2,
    },
  };

  const mockResourceReply = {
    _source: {
      'git@github.com:elastic/kibana': {
        state: RouteState.Started,
        node: '073fb287-161c-49f3-976d-1e507575e354',
        type: 'code',
      },
      'git@github.com:elastic/elasticsearch': {
        state: RouteState.Started,
        node: nodeName,
        type: 'code',
      },
    },
  };

  // yay lets implement what es would do with these scripts...
  let calls = 0;
  const esClients = {
    adminClient: {},
    dataClient: {
      callAsInternalUser: jest.fn<Promise<any>, any>(async (method, params) => {
        console.log('calls', ++calls);
        if (params.id === 'proxy-heartbeat-list') {
          if (method === 'get') {
            // don't forget js is pass-by-reference! we need a _new_ object here
            return JSON.parse(JSON.stringify(mockHeartbeatReply));
          } else {
            if (params.body.script === updateHeartbeat) {
              const resource = params.body.params.resource;
              mockHeartbeatReply._source[params.body.params.resource]++;
              return;
            } else if (params.body.script === cullDeadNodes) {
              const nodes = params.body.params.nodeList;
              for (let [key, val] of Object.entries(mockHeartbeatReply._source)) {
                if (val === nodes[key]) {
                  delete mockHeartbeatReply._source[key];
                  return;
                }
              }
            }
          }
        } else {
          if (method === 'update') {
            if (params.body.script) {
              if (params.body.script === unassignResource) {
                const key = Object.entries(mockResourceReply._source).find(
                  entry => entry[1].node === params.body.params.resource
                );
                delete mockResourceReply._source[key[0]];
                return;
              } else {
                const nodeList = params.body.params.nodes;
                for (let [key, val] of Object.entries(mockResourceReply._source)) {
                  if (!nodeList.contains(key)) {
                    if (val.state === RouteState.Closing) {
                      delete mockResourceReply._source[key];
                    } else {
                      val.state = RouteState.Closing;
                    }
                  }
                }
                return;
              }
            }
          }
        }
      }),
    },
  };

  const elasticClient = elasticsearchServiceMock.createSetupContract(esClients);
  const config = configService({
    updateInterval: 100,
    timeoutThreshold: 100,
  });
  const clusterDoc = new ClusterDocClient({ config, env, logger });
  clusterDoc.nodeName = nodeName;

  try {
    await clusterDoc.setup(elasticClient);
    await clusterDoc.start();
  } catch (err) {
    expect(err).toBeFalsy();
  }

  // gets called twice before we force the timer to run
  expect(esClients.dataClient.callAsInternalUser).toHaveBeenCalledTimes(2);
  jest.runAllTimers();
  expect(setTimeout).toHaveBeenCalledTimes(2);
  // should be called another 3 times when we get here
  expect(Object.keys(mockHeartbeatReply._source).length).toBe(1);
  expect(Object.keys(mockResourceReply._source).length).toBe(1);
});

xtest('assign and unassign resource', async () => {
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

xtest('it continues on errors', async () => {
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
  } catch (err) {
    expect(err).toBeFalsy();
  }

  expect(setTimeout).toHaveBeenCalledTimes(1);
});

xtest('it continues on errors still', async () => {
  const esClients = {
    adminClient: {},
    dataClient: {
      callAsInternalUser: jest.fn(() => {
        return new Promise((resolve, reject) => {
          reject(new Error('bar'));
        });
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
  } catch (err) {
    expect(err).toBeFalsy();
  }

  setTimeout(() => {
    expect(setTimeout).toHaveBeenCalledTimes(2);
  }, 1);

  jest.runAllTimers();
});
