/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';
import { EXTENDED_TIMEOUT, SERVICE_MOBILE_ANDROID } from '../../fixtures/constants';

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
      await serviceDetailsPage.goToMobileServiceOverview(SERVICE_MOBILE_ANDROID, {
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });

      const serviceMapSection = page.getByTestId('apmMobileServiceOverviewServiceMapSection');
      const contextualServiceMapControls = page.getByTestId('contextualServiceMapControls');
      const exploreInServiceMapLink = page.getByTestId(
        'apmMobileServiceOverviewExploreInServiceMap'
      );
      const contextualServiceMapGraph = page.getByTestId('contextualServiceMapGraph');
      const serviceNode = contextualServiceMapGraph
        .locator(`[data-id="${SERVICE_MOBILE_ANDROID}"]`)
        .getByTestId('serviceMapNodeServiceCircle');

      await test.step('Renders the service map section and controls', async () => {
        await expect(serviceMapSection).toBeVisible();
        await expect(contextualServiceMapControls).toBeVisible();
        await expect(exploreInServiceMapLink).toBeVisible();
        await expect(exploreInServiceMapLink).toHaveAttribute(
          'href',
          new RegExp(`/services/${SERVICE_MOBILE_ANDROID}/service-map`)
        );
      });

      await test.step('Loads the contextual map centered on the current service', async () => {
        await contextualServiceMapGraph.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
        await serviceNode.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
        await expect(serviceNode).toBeVisible();
      });

      await test.step('Opens a service node popover from the contextual map', async () => {
        await serviceNode.click();
        await expect(page.getByTestId('serviceMapPopoverContent')).toBeVisible();
        await expect(page.getByTestId('serviceMapPopoverTitle')).toHaveText(SERVICE_MOBILE_ANDROID);
      });
    });
  }
);
