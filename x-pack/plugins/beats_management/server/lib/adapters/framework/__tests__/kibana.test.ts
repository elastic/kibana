/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// file.skip

// @ts-ignore
import { createEsTestCluster } from '@kbn/test';
import { config as beatsPluginConfig, configPrefix } from '../../../../..';
// @ts-ignore
import * as kbnTestServer from '../../../../../../../../src/test_utils/kbn_server';
import { KibanaBackendFrameworkAdapter } from '../kibana_framework_adapter';
import { contractTests } from './test_contract';

const kbnServer = kbnTestServer.getKbnServer(kbnTestServer.createRootWithCorePlugins());

contractTests('Kibana  Framework Adapter', {
  before: async () => {
    await kbnServer.ready();

    const config = kbnServer.server.config();
    config.extendSchema(beatsPluginConfig, {}, configPrefix);

    config.set('xpack.beats.encryptionKey', 'foo');
  },
  after: async () => {
    await kbnServer.close();
  },
  adapterSetup: () => {
    return new KibanaBackendFrameworkAdapter(kbnServer.server);
  },
});
