/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

test.describe('APM feature controls - rules', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { featureControlsPage } }) => {
    await browserAuth.loginAsAdmin();
    await featureControlsPage.gotoApm();
    await featureControlsPage.waitForApmToLoad();
  });

  test('opens the latency rule flyout and shows the related dashboards section on details', async ({
    pageObjects: { alertsControls },
  }) => {
    await test.step('open the alerts menu and create a latency threshold rule', async () => {
      await alertsControls.openContextMenu();
      await alertsControls.openLatencyFlyout();
    });

    await test.step('navigate to the Details step', async () => {
      await alertsControls.addRuleFlyout.jumpToStep('details');
    });

    await test.step('related dashboards section is visible', async () => {
      await expect(alertsControls.addRuleFlyout.relatedDashboards).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
    });
  });
});
