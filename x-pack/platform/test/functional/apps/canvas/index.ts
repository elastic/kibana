/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EsArchiver } from '@kbn/es-archiver';
import type { FtrProviderContext } from '../../ftr_provider_context';
export default ({ loadTestFile, getService }: FtrProviderContext) => {
  const security = getService('security');
  const config = getService('config');
  let esNode: EsArchiver;

  describe('Canvas', function canvasAppTestSuite() {
    const isRunningInCcsMode = config.get('esTestCluster.ccs') ? true : false;
    describe('Canvas app', () => {
      before(async () => {
        // init data
        const roles = [
          'test_logstash_reader',
          'global_canvas_all',
          'global_discover_all',
          'global_maps_all',
          // TODO: Fix permission check, save and return button is disabled when dashboard is disabled
          'global_dashboard_all',
        ];
        if (isRunningInCcsMode) roles.push('ccs_remote_search');
        await security.testUser.setRoles(roles);
        esNode = isRunningInCcsMode
          ? getService('remoteEsArchiver' as 'esArchiver')
          : getService('esArchiver');
        await esNode.loadIfNeeded('x-pack/platform/test/fixtures/es_archives/logstash_functional');
      });

      after(async () => {
        await security.testUser.restoreDefaults();
      });

      if (isRunningInCcsMode) {
        loadTestFile(require.resolve('./smoke_test'));
      } else {
        // Note: most of the Canvas FTR suite was migrated to Scout
        // (x-pack/platform/plugins/private/canvas/test/scout). The specs kept here still run in
        // the Firefox cross-browser config (tagged `includeFirefox`); `smoke_test` also runs in
        // the CCS config above.
        loadTestFile(require.resolve('./smoke_test'));
        loadTestFile(require.resolve('./expression'));
        loadTestFile(require.resolve('./filters'));
        loadTestFile(require.resolve('./custom_elements'));
        loadTestFile(require.resolve('./datasource'));
        loadTestFile(require.resolve('./feature_controls/canvas_security'));
        loadTestFile(require.resolve('./feature_controls/canvas_spaces'));
        loadTestFile(require.resolve('./saved_object_resolve'));
      }
    });
  });
};
