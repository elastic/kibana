/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// file.skip

import { beatsIndexTemplate } from 'x-pack/plugins/beats_management/server/index_templates';
import * as kbnTestServer from '../../../../../../../../src/test_utils/kbn_server';
import { TestKbnServerConfig } from '../../../../../../../test_utils/kbn_server_config';
import { INDEX_NAMES } from '../../../../../common/constants/index_names';
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
  adapterSetup: async () => {
    await servers.kbnServer.server.plugins.elasticsearch
      .getCluster('admin')
      .callWithInternalUser('indices.delete', {
        index: INDEX_NAMES.BEATS,
        ignore: [404],
      });
    const database = new KibanaDatabaseAdapter(servers.kbnServer.server.plugins
      .elasticsearch as DatabaseKbnESPlugin);
    try {
      await database.putTemplate(INDEX_NAMES.BEATS, beatsIndexTemplate);
    } catch (e) {
      throw e;
    }

    return new ElasticsearchBeatsAdapter(database);
  },
});
