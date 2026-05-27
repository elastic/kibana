/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { EuiComboBoxWrapper } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';
import {
  EXTENDED_TIMEOUT,
  PRODUCTION_ENVIRONMENT,
  SERVICE_SYNTH_NODE_1,
} from '../../fixtures/constants';

// Constants for template URL validation tests
const templateUrl =
  'http://scoutURLExample.com/ftw/app/apm/services/{{service.name}}/transactions/view?comparisonEnabled=true&environment={{service.environment}}';
const getExpectedUrl = (serviceName: string, environment: string) =>
  `http://scoutURLExample.com/ftw/app/apm/services/${serviceName}/transactions/view?comparisonEnabled=true&environment=${environment}`;

test.describe(
  'Custom links template validation',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test('template URL with filters — create from settings, verify in transaction, delete', async ({
      page,
      pageObjects: { customLinksPage, transactionDetailsPage },
      browserAuth,
    }) => {
      const uniqueLabel = `template-test-${randomUUID()}`;
      const expectedUrl = getExpectedUrl(SERVICE_SYNTH_NODE_1, PRODUCTION_ENVIRONMENT);

      await browserAuth.loginAsPrivilegedUser();

      await test.step('Create custom link with template URL and filters', async () => {
        await customLinksPage.goto();
        await customLinksPage.clickCreateCustomLink();
        await expect(page.getByRole('heading', { name: 'Create link', level: 2 })).toBeVisible();

        await customLinksPage.fillLabel(uniqueLabel);
        await customLinksPage.fillUrl(templateUrl);

        // Add first filter (uses existing empty filter row)
        await customLinksPage.addFirstFilter('service.name', SERVICE_SYNTH_NODE_1);

        // Add additional filter (explicitly adds new filter row)
        await customLinksPage.addAdditionalFilter('service.environment', PRODUCTION_ENVIRONMENT);

        await expect(page.getByTestId('preview-url')).toContainText(expectedUrl, {
          timeout: EXTENDED_TIMEOUT,
        });

        await expect(customLinksPage.saveButton).toBeEnabled();
        await customLinksPage.clickSave();

        // Verify we're back on the main page and our link row appears in the table
        await expect(page).toHaveURL(/.*custom-links$/);
        await expect(customLinksPage.getCustomLinkRow(uniqueLabel)).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });

      await test.step('Verify template variables are populated correctly in custom link URLs', async () => {
        await transactionDetailsPage.goToTransactionDetails({
          serviceName: testData.SERVICE_SYNTH_NODE_1,
          transactionName: testData.APPLE_TRANSACTION_NAME,
          start: 'now-1h',
          end: 'now',
        });

        await page
          .getByTestId('criticalPathToggle')
          .scrollIntoViewIfNeeded({ timeout: EXTENDED_TIMEOUT });

        // Open action menu and verify template population
        await transactionDetailsPage.openActionMenu();

        const actualHref = await transactionDetailsPage.getCustomLinkHref(uniqueLabel);

        expect(actualHref).toBe(expectedUrl);
      });

      await test.step('Delete custom link with template URL', async () => {
        await customLinksPage.goto();
        await customLinksPage.clickEditCustomLinkForRow(uniqueLabel);
        await customLinksPage.clickDelete();

        // Verify deletion
        await expect(page).toHaveURL(/.*custom-links$/);
        await expect(customLinksPage.getCustomLinkRow(uniqueLabel)).toBeHidden({
          timeout: EXTENDED_TIMEOUT,
        });

        await expect(page.getByTestId('euiToastHeader__title')).toHaveText('Deleted custom link.');
      });
    });

    test('default URL flow — create link from transaction details with prefilled filters, delete', async ({
      page,
      pageObjects: { transactionDetailsPage, customLinksPage },
      browserAuth,
    }) => {
      const defaultLabel = `template-test-default-${randomUUID()}`;
      const expectedUrl = getExpectedUrl(SERVICE_SYNTH_NODE_1, PRODUCTION_ENVIRONMENT);

      await browserAuth.loginAsPrivilegedUser();

      await test.step('Open transaction and validate the default url when creating a custom link', async () => {
        await transactionDetailsPage.goToTransactionDetails({
          serviceName: testData.SERVICE_SYNTH_NODE_1,
          transactionName: testData.APPLE_TRANSACTION_NAME,
          start: 'now-1h',
          end: 'now',
        });

        await page
          .getByTestId('criticalPathToggle')
          .scrollIntoViewIfNeeded({ timeout: EXTENDED_TIMEOUT });
        await transactionDetailsPage.openActionMenu();

        // Click the create custom link button from action menu
        const createButton = page
          .getByTestId('apmCustomLinkToolbarCreateButton')
          .or(page.getByTestId('apmBottomSectionCreateCustomLinkButton'));
        await createButton.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
        await createButton.click();

        // Verify the flyout opens
        await expect(page.getByRole('heading', { name: 'Create link', level: 2 })).toBeVisible();

        // Verify pre-populated filters
        await page
          .getByTestId('service.name.value')
          .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
        const serviceNameComboBox = new EuiComboBoxWrapper(page, {
          dataTestSubj: 'service.name.value',
        });
        const serviceNameValue = await serviceNameComboBox.getSelectedValue();
        expect(serviceNameValue).toBe(SERVICE_SYNTH_NODE_1);

        await page
          .getByTestId('service.environment.value')
          .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
        const serviceEnvComboBox = new EuiComboBoxWrapper(page, {
          dataTestSubj: 'service.environment.value',
        });
        const serviceEnvValue = await serviceEnvComboBox.getSelectedValue();
        expect(serviceEnvValue).toBe(PRODUCTION_ENVIRONMENT);

        await customLinksPage.fillLabel(defaultLabel);
        await customLinksPage.fillUrl(templateUrl);

        await expect(page.getByTestId('preview-url')).toContainText(expectedUrl, {
          timeout: EXTENDED_TIMEOUT,
        });

        await expect(customLinksPage.saveButton).toBeEnabled();
        await customLinksPage.clickSave();

        await page
          .getByTestId('criticalPathToggle')
          .scrollIntoViewIfNeeded({ timeout: EXTENDED_TIMEOUT });

        await transactionDetailsPage.openActionMenu();
        await expect(page.getByRole('link', { name: defaultLabel })).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });

        const actualHref = await transactionDetailsPage.getCustomLinkHref(defaultLabel);
        expect(actualHref).toBe(expectedUrl);
      });

      await test.step('Delete custom link created from transaction details', async () => {
        await customLinksPage.goto();
        await customLinksPage.clickEditCustomLinkForRow(defaultLabel);
        await customLinksPage.clickDelete();

        await expect(page).toHaveURL(/.*custom-links$/);
        await expect(customLinksPage.getCustomLinkRow(defaultLabel)).toBeHidden({
          timeout: EXTENDED_TIMEOUT,
        });

        await expect(page.getByTestId('euiToastHeader__title')).toHaveText('Deleted custom link.');
      });
    });
  }
);
