/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// @ts-ignore
import { createEsTestCluster } from '@kbn/test';
// @ts-ignore
import * as kbnTestServer from '../../../../../../../../src/test_utils/kbn_server';
import {
  config as beatsPluginConfig,
  configPrefix,
} from '../../../../../index';
import { KibanaBackendFrameworkAdapter } from '../kibana_framework_adapter';
import { contractTests } from './test_contract';

const kbnServer = kbnTestServer.createServerWithCorePlugins();
const es = createEsTestCluster({});

contractTests('Kibana  Framework Adapter', {
  before: async () => {
    await es.start();
    await kbnServer.ready();
    return await kbnServer.server.plugins.elasticsearch.waitUntilReady();
  },
  after: async () => {
    await kbnServer.close();
    return await es.cleanup();
  },
  adapterSetup: () => {
    const config = kbnServer.server.config();

    config.extendSchema(beatsPluginConfig, {}, configPrefix);
    config.set('xpack.beats.encryptionKey', 'foo');

    return new KibanaBackendFrameworkAdapter(kbnServer.server);
  },
});
