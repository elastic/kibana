/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// file.skip

import * as kbnTestServer from '../../../../../../../../src/test_utils/kbn_server';
import { TestKbnServerConfig } from '../../../../../../../test_utils/kbn_server_config';
import { DatabaseKbnESPlugin } from '../../database/adapter_types';
import { KibanaDatabaseAdapter } from '../../database/kibana_database_adapter';
import { ElasticsearchBeatsAdapter } from '../elasticsearch_beats_adapter';
import { contractTests } from './test_contract';

let servers: any;
contractTests('Beats Elasticsearch Adapter', {
  async before() {
    servers = await kbnTestServer.startTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: TestKbnServerConfig,
    });
  },
  async after() {
    await servers.stop();
  },
  adapterSetup: () => {
    const database = new KibanaDatabaseAdapter(servers.kbnServer.server.plugins
      .elasticsearch as DatabaseKbnESPlugin);
    return new ElasticsearchBeatsAdapter(database);
  },
});
