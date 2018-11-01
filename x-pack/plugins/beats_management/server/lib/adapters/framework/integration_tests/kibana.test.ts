/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// file.skip

// @ts-ignore
import { esTestConfig, kbnTestConfig, OPTIMIZE_BUNDLE_DIR } from '@kbn/test';
import { resolve } from 'path';
import * as kbnTestServer from '../../../../../../../../src/test_utils/kbn_server';
import { KibanaBackendFrameworkAdapter } from './../kibana_framework_adapter';
import { contractTests } from './test_contract';

let servers: any;
contractTests('Kibana  Framework Adapter', {
  async before() {
    servers = await kbnTestServer.startTestServers({
      adjustTimeout: t => jest.setTimeout(t),
      settings: {
        kbn: {
          plugins: { paths: [resolve(__dirname, '../../../../../../../../node_modules/x-pack')] },
          logging: { verbose: true, silent: false },
        },
        es: {
          license: 'trial',
        },
      },
    });

    // const config = legacyServer.server.config();
    // config.extendSchema(beatsPluginConfig, {}, configPrefix);

    // config.set('xpack.beats.encryptionKey', 'foo');
  },
  async after() {
    await servers.stop();
  },
  adapterSetup: () => {
    return new KibanaBackendFrameworkAdapter(servers.kbnServer.server);
  },
});
