/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// file.skip

// @ts-ignore
import { createEsTestCluster } from '@kbn/test';
import { resolve } from 'path';
// @ts-ignore
import * as kbnTestServer from '../../../../../../../../src/test_utils/kbn_server';
import { contractTests } from './test_contract';

const root = kbnTestServer.createRootWithCorePlugins({
  plugins: { paths: [resolve(__dirname, '../../../../../../../../node_modules/x-pack')] },
  xpack: {
    reporting: { enabled: false },
    monitoring: { enabled: false },
    cloud: { enabled: false },
    apm: { enabled: false },

    infra: { enabled: false },

    watcher: { enabled: false },

    rollup: { enabled: false },
  },
  optimize: {
    enabled: false,
  },

  logging: { verbose: true, silent: false },
});

let legacyServer: any;
contractTests('Kibana  Framework Adapter', {
  before: async () => {
    await root.start();

    legacyServer = kbnTestServer.getKbnServer(root);

    // const config = legacyServer.server.config();
    // config.extendSchema(beatsPluginConfig, {}, configPrefix);

    // config.set('xpack.beats.encryptionKey', 'foo');
  },
  after: async () => {
    await root.shutdown();
  },
  adapterSetup: () => {
    return legacyServer; // new KibanaBackendFrameworkAdapter(legacyServer.server);
  },
});
