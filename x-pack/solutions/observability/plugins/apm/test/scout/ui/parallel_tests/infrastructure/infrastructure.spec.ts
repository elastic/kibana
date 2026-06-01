/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

test.describe(
  'Infrastructure tab',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('passes automated accessibility checks', async ({
      page,
      pageObjects: { serviceDetailsPage },
    }) => {
      await serviceDetailsPage.infrastructureTab.goToTab({
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
        serviceName: testData.SERVICE_INFRA_ALL_DATA,
      });

      await test.step('verify infrastructure panel has no accessibility violations', async () => {
        await expect(serviceDetailsPage.infrastructureTab.hostsTab).toBeVisible();
        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="apmInfrastructureTabPanel"]'],
        });
        expect(violations).toHaveLength(0);
      });
    });

    test('shows container, pod, and host tabs when all infrastructure attributes exist', async ({
      pageObjects: { serviceDetailsPage },
    }) => {
      await serviceDetailsPage.infrastructureTab.goToTab({
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
        serviceName: testData.SERVICE_INFRA_ALL_DATA,
      });

      await expect(serviceDetailsPage.infrastructureTab.helpButton).toBeVisible();
      await expect(serviceDetailsPage.infrastructureTab.containersTab).toBeVisible();
      await expect(serviceDetailsPage.infrastructureTab.podsTab).toBeVisible();
      await expect(serviceDetailsPage.infrastructureTab.hostsTab).toBeVisible();
    });

    test('shows only the host tab when only host attributes exist', async ({
      pageObjects: { serviceDetailsPage },
    }) => {
      await serviceDetailsPage.infrastructureTab.goToTab({
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
        serviceName: testData.SERVICE_INFRA_HOST_ONLY,
      });

      await expect(serviceDetailsPage.infrastructureTab.helpButton).toBeVisible();
      await expect(serviceDetailsPage.infrastructureTab.hostsTab).toBeVisible();
      await expect(serviceDetailsPage.infrastructureTab.containersTab).toBeHidden();
      await expect(serviceDetailsPage.infrastructureTab.podsTab).toBeHidden();
    });

    test('shows no data message when no infrastructure attributes exist', async ({
      pageObjects: { serviceDetailsPage },
    }) => {
      await serviceDetailsPage.infrastructureTab.goToTab({
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
        serviceName: testData.SERVICE_INFRA_NO_DATA,
      });

      await expect(serviceDetailsPage.infrastructureTab.emptyPrompt).toBeVisible();
    });
  }
);
