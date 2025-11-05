/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const ml = getService('ml');

  describe('supplied configurations', function () {
    this.tags(['ml']);

    it('loads supplied configuration page', async () => {
      await ml.testExecution.logTestStep('loads all supplied configurations');
      await ml.navigation.navigateToMl();
      await ml.navigation.navigateToSuppliedConfigurations();
      await ml.suppliedConfigurations.assertAllConfigurationsAreLoaded();
    });

    it('shows supplied configuration details in flyout', async () => {
      const suppliedConfigId = 'apache_ecs';
      await ml.testExecution.logTestStep(
        'opens flyout for selected card with configuration details when card is clicked'
      );
      await ml.suppliedConfigurations.clickSuppliedConfigCard(suppliedConfigId);
      await ml.suppliedConfigurations.assertFlyoutContainsExpectedTabs([
        'overview',
        'jobs',
        'kibana',
      ]);
      await ml.suppliedConfigurations.closeFlyout(suppliedConfigId);
    });
  });
}
