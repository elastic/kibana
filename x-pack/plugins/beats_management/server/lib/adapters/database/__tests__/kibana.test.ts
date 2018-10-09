/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// file.skip

// @ts-ignore
import { createEsTestCluster } from '@kbn/test';
// @ts-ignore
import * as kbnTestServer from '../../../../../../../../src/test_utils/kbn_server';
import { DatabaseKbnESPlugin } from '../adapter_types';
import { KibanaDatabaseAdapter } from '../kibana_database_adapter';
import { contractTests } from './test_contract';

const kbnServer = kbnTestServer.getKbnServer(kbnTestServer.createRootWithCorePlugins());

const es = createEsTestCluster({});

contractTests('Kibana Database Adapter', {
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
    return new KibanaDatabaseAdapter(kbnServer.server.plugins.elasticsearch as DatabaseKbnESPlugin);
  },
});
