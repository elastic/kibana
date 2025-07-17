/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const es = getService('es');
  const security = getService('security');
  const PageObjects = getPageObjects(['settings', 'common']);
  const soInfo = getService('savedObjectInfo');
  const log = getService('log');

  describe('"Create Index Pattern" wizard', function () {
    before(async function () {
      await soInfo.logSoTypes(log);
      await security.testUser.setRoles([
        'global_index_pattern_management_all',
        'test_logs_data_reader',
      ]);
      await kibanaServer.uiSettings.replace({});
      await PageObjects.settings.navigateTo();
    });

    describe('data streams', () => {
      it('can be an index pattern', async () => {
        await es.transport.request({
          path: '/_index_template/generic-logs',
          method: 'PUT',
          body: {
            index_patterns: ['logs-*', 'test_data_stream'],
            template: {
              mappings: {
                properties: {
                  '@timestamp': {
                    type: 'date',
                  },
                },
              },
            },
            data_stream: {},
          },
        });

        await es.transport.request({
          path: '/_data_stream/test_data_stream',
          method: 'PUT',
        });

        await PageObjects.settings.clickKibanaIndexPatterns();
        await PageObjects.settings.createIndexPattern('test_data_stream');
      });
    });

    after(async () => {
      await kibanaServer.savedObjects.clean({ types: ['index-pattern'] });
      await es.transport.request({
        path: '/_data_stream/test_data_stream',
        method: 'DELETE',
      });
      await security.testUser.restoreDefaults();
      await soInfo.logSoTypes(log);
    });
  });
}
