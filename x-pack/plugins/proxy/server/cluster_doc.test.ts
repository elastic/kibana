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
import { ElasticsearchService } from '../../../../src/core/server/elasticsearch/elasticsearch_service';

const logger = loggingServiceMock.create();
const env = Env.createDefault(getEnvOptions());

const createConfigService = (value: Partial<ProxyPluginType> = {}) => {
  const configService = new ConfigService(
    new BehaviorSubject<Config>(
      new ObjectToConfigAdapter({
        server: value,
      })
    ),
    env,
    logger
  );
  configService.setSchema('xpack.proxy', ProxyConfig.schema);
  return configService;
};

let configService = {
  create: () => createConfigService().getConfig$(),
};
beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllMocks();
});

it('correctly instantiates', async () => {
  const elasticClient = elasticsearchServiceMock.create();
  const clusterDoc = new ClusterDocClient({ config: configService, env, logger });
  await clusterDoc.setup({ elasticsearch: elasticClient });
  await clusterDoc.start();
  expect(setTimeout).toHaveBeenCalledTimes(1);
});
