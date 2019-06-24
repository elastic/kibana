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

test('initial run of main loop works', async () => {
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
  const nodeName2 = '073fb287-161c-49f3-976d-1e507575e354';
  const mockHeartbeatReply = {
    _source: {
      [nodeName2]: 1, // this node will be culled
      [nodeName]: 2,
    },
  };

  const mockResourceReply = {
    _source: {
      'git@github.com:elastic/kibana': {
        state: RouteState.Started,
        node: nodeName2,
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
  const esClients = {
    adminClient: {},
    dataClient: {
      callAsInternalUser: jest.fn<Promise<any>, any>(async (method, params) => {
        if (params.id === 'proxy-heartbeat-list') {
          if (method === 'get') {
            // don't forget js is pass-by-reference! we need a _new_ object here
            return JSON.parse(JSON.stringify(mockHeartbeatReply));
          } else {
            if (params.body.script === updateHeartbeat) {
              const resource = params.body.params.resource;
              mockHeartbeatReply._source[params.body.params.resource]++;
            } else if (params.body.script === cullDeadNodes) {
              const nodes = params.body.params.nodeList;
              for (const [key, val] of Object.entries(mockHeartbeatReply._source)) {
                if (val === nodes[key]) {
                  delete mockHeartbeatReply._source[key];
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
              } else if (params.body.script === cullDeadResources) {
                const nodeList = params.body.params.nodes;
                for (const [key, val] of Object.entries(mockResourceReply._source)) {
                  if (!nodeList.includes(val.node)) {
                    if (val.state === RouteState.Closing) {
                      delete mockResourceReply._source[key];
                    } else {
                      val.state = RouteState.Closing;
                    }
                  } else if (val.state === RouteState.Closing) {
                    val.state = RouteState.Started;
                  }
                }
              }
            } else {
              Object.assign(mockResourceReply._source, params.body);
            }
          } else {
            return JSON.parse(JSON.stringify(mockResourceReply));
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
  } catch (err) {
    expect(err).toBeFalsy();
  }

  // misses a single update, remove node and set resource to closing
  await clusterDoc.updateHeartbeat();
  (clusterDoc as any).nodeCache = await clusterDoc.getHeartbeats();
  await clusterDoc.updateHeartbeat();
  await clusterDoc.cullDeadNodes();
  expect(esClients.dataClient.callAsInternalUser).toHaveBeenCalledTimes(6);
  expect(Object.keys(mockHeartbeatReply._source).length).toBe(1);
  expect(Object.keys(mockResourceReply._source).length).toBe(2);
  expect(mockResourceReply._source['git@github.com:elastic/kibana'].state).toBe(RouteState.Closing);

  // updates, restores to routing doc and resource is started
  await clusterDoc.updateHeartbeat();
  mockHeartbeatReply._source[nodeName2] = 3;
  (clusterDoc as any).nodeCache = await clusterDoc.getHeartbeats();
  await clusterDoc.updateHeartbeat();
  mockHeartbeatReply._source[nodeName2] = 4;
  await clusterDoc.cullDeadNodes();
  expect(Object.keys(mockHeartbeatReply._source).length).toBe(2);
  expect(Object.keys(mockResourceReply._source).length).toBe(2);
  expect(mockResourceReply._source['git@github.com:elastic/kibana'].state).toBe(RouteState.Started);

  // misses two updates, remove resource
  await clusterDoc.updateHeartbeat();
  (clusterDoc as any).nodeCache = await clusterDoc.getHeartbeats();
  await clusterDoc.updateHeartbeat();
  mockHeartbeatReply._source[nodeName2] = (clusterDoc as any).nodeCache[nodeName2];
  mockResourceReply._source['git@github.com:elastic/kibana'].state = RouteState.Closing;
  await clusterDoc.cullDeadNodes();
  expect(Object.keys(mockResourceReply._source).length).toBe(1);
  expect(mockResourceReply._source['git@github.com:elastic/kibana']).toBeFalsy();

  // add a new resource
  await clusterDoc.assignResource('git@github.com:elastic/beats', 'code', RouteState.Started);
  expect(Object.keys(mockResourceReply._source).length).toBe(2);

  // add existing resource
  try {
    await clusterDoc.assignResource('git@github.com:elastic/beats', 'code', RouteState.Started);
  } catch (err) {
    expect(err.message).toBe(
      `git@github.com:elastic/beats already exists on ${clusterDoc.nodeName}`
    );
  }
});

test('it continues on errors', async () => {
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
