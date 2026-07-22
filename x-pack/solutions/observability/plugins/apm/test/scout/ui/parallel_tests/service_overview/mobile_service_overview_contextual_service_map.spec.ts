/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';
import { SERVICE_MOBILE_ANDROID } from '../../fixtures/constants';

test.describe(
  'Mobile Service Overview - Contextual service map',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('renders the contextual service map section with controls and focal service', async ({
      page,
      pageObjects: { serviceDetailsPage },
    }) => {
      const { mobileOverviewTab: overviewTab } = serviceDetailsPage;

      await serviceDetailsPage.goToMobileServiceOverview(SERVICE_MOBILE_ANDROID, {
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });

      await test.step('Renders the service map section and controls', async () => {
        await expect(overviewTab.serviceMapSection).toBeVisible();
        await expect(overviewTab.contextualServiceMapControls).toBeVisible();
        await expect(overviewTab.exploreInServiceMapLink).toBeVisible();
        await expect(overviewTab.exploreInServiceMapLink).toHaveAttribute(
          'href',
          new RegExp(`/services/${SERVICE_MOBILE_ANDROID}/service-map`)
        );
      });

      await test.step('Loads the contextual map centered on the current service', async () => {
        await overviewTab.waitForContextualServiceMapToLoad();
        await overviewTab.waitForContextualServiceNodeToLoad(SERVICE_MOBILE_ANDROID);
      });

      await test.step('Opens the service flyout from a service node on the contextual map', async () => {
        await overviewTab.getContextualServiceNode(SERVICE_MOBILE_ANDROID).click();
        await expect(page.getByTestId('serviceFlyout')).toBeVisible();
        await expect(page.getByTestId('serviceFlyoutTitleLink')).toHaveText(SERVICE_MOBILE_ANDROID);
      });
    });
  }
);
