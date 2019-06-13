/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Observable, BehaviorSubject } from 'rxjs';

import { ClusterDocClient } from './cluster_doc';
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

it('timeouts are set correctly on the main loop', async () => {
  const esClients = {
    adminClient: {},
    dataClient: {
      callAsInternalUser: jest.fn<Promise<any>, any>(async () => ({})),
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
  clusterDoc.stop();
  expect(esClients.dataClient.callAsInternalUser.mock.calls[0][0]).toBe('get');
});
