/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// file.skip

// @ts-ignore
import { createEsTestCluster } from '@kbn/test';
import { config as beatsPluginConfig } from '../../../../..';
// @ts-ignore
import * as kbnTestServer from '../../../../../../../../src/test_utils/kbn_server';
import { KibanaBackendFrameworkAdapter } from '../kibana_framework_adapter';
import { PLUGIN } from './../../../../../common/constants/plugin';
import { CONFIG_PREFIX } from './../../../../../common/constants/plugin';
import { contractTests } from './test_contract';

const kbnServer = kbnTestServer.createRootWithCorePlugins({ server: { maxPayloadBytes: 100 } });
const legacyServer = kbnTestServer.getKbnServer(kbnServer);

contractTests('Kibana  Framework Adapter', {
  before: async () => {
    await kbnServer.start();

    const config = legacyServer.server.config();
    config.extendSchema(beatsPluginConfig, {}, CONFIG_PREFIX);

    config.set('xpack.beats.encryptionKey', 'foo');
  },
  after: async () => {
    await kbnServer.shutdown();
  },
  adapterSetup: () => {
    return new KibanaBackendFrameworkAdapter(PLUGIN.ID, legacyServer.server);
  },
});
