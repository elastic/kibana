/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
// file.skip

import { beatsIndexTemplate } from 'x-pack/plugins/beats_management/server/index_templates';
import * as kbnTestServer from '../../../../../../../../src/test_utils/kbn_server';
import { TestKbnServerConfig } from '../../../../../../../test_utils/kbn_server_config';
import { DatabaseKbnESPlugin } from '../adapter_types';
import { KibanaDatabaseAdapter } from '../kibana_database_adapter';

describe('Elasticsearch bridge', () => {
  let databaseAdapter: any;
  let servers: any;
  beforeAll(async () => {
    servers = await kbnTestServer.startTestServers({
      adjustTimeout: (t: number) => jest.setTimeout(t),
      settings: TestKbnServerConfig,
    });
  });
  afterAll(async () => {
    await servers.stop();
  });
  beforeEach(async () => {
    databaseAdapter = new KibanaDatabaseAdapter(servers.kbnServer.server.plugins
      .elasticsearch as DatabaseKbnESPlugin);
  });

  it('Should putTemplate current template version', () => {
    let result;
    expect(() => {
      result = databaseAdapter.putTemplate('beats-template', beatsIndexTemplate);
    }).not.toThrow();
    expect(result).toMatchSnapshot();
  });
});
