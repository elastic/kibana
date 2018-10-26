/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// file.skip

// @ts-ignore
import { esTestConfig, kbnTestConfig, OPTIMIZE_BUNDLE_DIR } from '@kbn/test';
import { resolve } from 'path';
import { format as formatUrl } from 'url';
// @ts-ignore
import * as kbnTestServer from '../../../../../../../../src/test_utils/kbn_server';
import { contractTests } from './test_contract';

const kbnSettings = {
  plugins: { paths: [resolve(__dirname, '../../../../../../../../node_modules/x-pack')] },

  elasticsearch: {
    url: formatUrl(esTestConfig.getUrlParts()),
    username: esTestConfig.getUrlParts().username,
    password: esTestConfig.getUrlParts().password,
  },

  logging: { verbose: true, silent: false },
};

let servers: any;
contractTests('Kibana  Framework Adapter', {
  async before() {
    servers = await kbnTestServer.startTestServers({
      adjustTimeout: t => jest.setTimeout(t),
      settings: kbnSettings,
      license: 'trial',
    });

    await servers.kbnServer.server.plugins.elasticsearch.waitUntilReady();

    // const config = legacyServer.server.config();
    // config.extendSchema(beatsPluginConfig, {}, configPrefix);

    // config.set('xpack.beats.encryptionKey', 'foo');
  },
  async after() {
    await servers.stop();
  },
  adapterSetup: () => {
    return servers.kbnServer; // new KibanaBackendFrameworkAdapter(legacyServer.server);
  },
});
