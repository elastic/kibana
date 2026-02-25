/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, loadTestFile }: FtrProviderContext) {
  const config = getService('config');
  const isCcs = config.get('esTestCluster.ccs');
  const esNode = isCcs ? getService('remoteEsArchiver' as 'esArchiver') : getService('esArchiver');
  const ml = getService('ml');

  describe('machine learning - anomaly detection - group 2', function () {
    this.tags(['skipFirefox']);

    before(async () => {
      await ml.securityCommon.createMlRoles();
      await ml.securityCommon.createMlUsers();
      await ml.securityUI.loginAsMlPowerUser();
    });

    after(async () => {
      await ml.securityUI.logout();
      await ml.securityCommon.cleanMlUsers();
      await ml.securityCommon.cleanMlRoles();
      await esNode.unload('x-pack/platform/test/fixtures/es_archives/ml/farequote');
      await esNode.unload('x-pack/platform/test/fixtures/es_archives/ml/ecommerce');
      await esNode.unload('x-pack/platform/test/fixtures/es_archives/ml/categorization_small');
      await esNode.unload('x-pack/platform/test/fixtures/es_archives/ml/event_rate_nanos');
      await ml.testResources.resetKibanaTimeZone();
    });

    if (!isCcs) {
      loadTestFile(require.resolve('./population_job'));
      loadTestFile(require.resolve('./geo_job'));
      loadTestFile(require.resolve('./saved_search_job'));
      loadTestFile(require.resolve('./advanced_job'));
    }
  });
}
