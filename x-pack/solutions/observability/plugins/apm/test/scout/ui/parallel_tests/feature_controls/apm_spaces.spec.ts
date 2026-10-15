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

const SPACE_APM_ENABLED = 'apm_features_enabled';
const SPACE_APM_DISABLED = 'apm_features_disabled';

test.describe('APM feature controls - spaces', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ apiServices }) => {
    await apiServices.spaces.create({
      id: SPACE_APM_ENABLED,
      name: SPACE_APM_ENABLED,
      disabledFeatures: [],
    });
    await apiServices.spaces.create({
      id: SPACE_APM_DISABLED,
      name: SPACE_APM_DISABLED,
      disabledFeatures: ['apm'],
    });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.spaces.delete(SPACE_APM_ENABLED);
    await apiServices.spaces.delete(SPACE_APM_DISABLED);
  });

  test('shows the Applications nav link when no features are disabled', async ({
    pageObjects: { featureControlsPage, collapsibleNav },
  }) => {
    await featureControlsPage.gotoHome(SPACE_APM_ENABLED);
    await collapsibleNav.expandNav();
    await expect(featureControlsPage.getNavLink('Applications')).not.toHaveCount(0, {
      timeout: EXTENDED_TIMEOUT,
    });
  });

  test('can navigate to the APM app when no features are disabled', async ({
    pageObjects: { featureControlsPage },
  }) => {
    await featureControlsPage.gotoApm(SPACE_APM_ENABLED);
    await featureControlsPage.waitForApmToLoad();
    await expect(featureControlsPage.apmMainContainer).toBeVisible();
  });

  test('does not show the Applications nav link when apm is disabled', async ({
    pageObjects: { featureControlsPage, collapsibleNav },
  }) => {
    await featureControlsPage.gotoHome(SPACE_APM_DISABLED);
    await collapsibleNav.expandNav();
    await expect(featureControlsPage.getNavLink('Applications')).toBeHidden();
  });

  test('renders the not-found page when navigating to APM directly when apm is disabled', async ({
    page,
    pageObjects: { featureControlsPage },
  }) => {
    await featureControlsPage.gotoApm(SPACE_APM_DISABLED);
    await expect(page.getByText('"statusCode":404')).toBeVisible({ timeout: EXTENDED_TIMEOUT });
  });
});
