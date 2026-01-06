/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ loadTestFile, getService }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');

  describe('drilldowns', function () {
    this.tags(['skipFirefox']);

    before(async () => {
      await esArchiver.loadIfNeeded(
        'x-pack/platform/test/fixtures/es_archives/logstash_functional'
      );
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'x-pack/platform/test/functional/fixtures/kbn_archives/dashboard_drilldowns/drilldowns'
      );
      await kibanaServer.uiSettings.replace({ defaultIndex: 'logstash-*' });
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
    });

    loadTestFile(require.resolve('./dashboard_to_dashboard_drilldown'));
    loadTestFile(require.resolve('./dashboard_to_url_drilldown'));
    // Requires xpack.discoverEnhanced.actions.exploreDataInContextMenu.enabled
    // setting set in kibana.yml to work (not enabled by default)
    loadTestFile(require.resolve('./explore_data_panel_action'));

    // Disabled for now as it requires xpack.discoverEnhanced.actions.exploreDataInChart.enabled
    // setting set in kibana.yml to work. Once that is enabled by default, we can re-enable this test suite.
    // loadTestFile(require.resolve('./explore_data_chart_action'));
  });
}
