/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';
import {
  EXTENDED_TIMEOUT,
  SERVICE_OPBEANS_JAVA,
  DEPENDENCY_POSTGRESQL,
} from '../../fixtures/constants';

test.describe(
  'Service Overview - Contextual service map',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('renders the contextual service map section with controls and focal service', async ({
      page,
      pageObjects: { serviceDetailsPage },
    }) => {
      const { overviewTab } = serviceDetailsPage;

      await overviewTab.goToTab({
        serviceName: SERVICE_OPBEANS_JAVA,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });

      await test.step('Renders the service map section and controls', async () => {
        await expect(overviewTab.serviceMapSection).toBeVisible();
        await expect(overviewTab.contextualServiceMapControls).toBeVisible();
        await expect(overviewTab.exploreInServiceMapLink).toBeVisible();
        await expect(overviewTab.exploreInServiceMapLink).toHaveAttribute(
          'href',
          new RegExp(`/services/${SERVICE_OPBEANS_JAVA}/service-map`)
        );
      });

      await test.step('Loads the contextual map centered on the current service', async () => {
        await overviewTab.waitForContextualServiceMapToLoad();
        await overviewTab.waitForContextualServiceNodeToLoad(SERVICE_OPBEANS_JAVA);
      });

      await test.step('Opens the service flyout from a service node on the contextual map', async () => {
        await overviewTab.getContextualServiceNode(SERVICE_OPBEANS_JAVA).click();
        await expect(page.getByTestId('serviceFlyout')).toBeVisible();
        await expect(page.getByTestId('serviceFlyoutTitleLink')).toHaveText(SERVICE_OPBEANS_JAVA);
      });
    });

    test('reveals hidden dependencies when hops are reduced and expand is clicked', async ({
      pageObjects: { serviceDetailsPage },
    }) => {
      const { overviewTab } = serviceDetailsPage;

      await overviewTab.goToTab({
        serviceName: SERVICE_OPBEANS_JAVA,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });

      await overviewTab.waitForContextualServiceMapToLoad();
      await overviewTab.waitForContextualServiceNodeToLoad(SERVICE_OPBEANS_JAVA);
      await overviewTab.contextualServiceMapControls.waitFor({
        state: 'visible',
        timeout: EXTENDED_TIMEOUT,
      });

      await test.step('Limit hops so dependencies stay hidden behind the focal service', async () => {
        await overviewTab.setContextualMapMaxHops(0);
        await expect(overviewTab.getContextualMapNodes()).toHaveCount(1, {
          timeout: EXTENDED_TIMEOUT,
        });
        await expect(
          overviewTab.getExpandHiddenDependenciesButton(SERVICE_OPBEANS_JAVA)
        ).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      });

      await test.step('Expand hidden dependencies from the focal service', async () => {
        await overviewTab.getExpandHiddenDependenciesButton(SERVICE_OPBEANS_JAVA).click();
        await expect(overviewTab.getContextualDependencyNode(DEPENDENCY_POSTGRESQL)).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
        await expect(
          overviewTab
            .getContextualServiceNodeRoot(SERVICE_OPBEANS_JAVA)
            .getByTestId('serviceMapCollapseExpandedButton')
        ).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      });
    });
  }
);
