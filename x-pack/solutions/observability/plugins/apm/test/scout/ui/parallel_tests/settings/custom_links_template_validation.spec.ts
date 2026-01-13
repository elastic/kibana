/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';
import {
  SERVICE_CUSTOM_LINK_TEST,
  CUSTOM_LINK_TEST_ENVIRONMENT,
  CUSTOM_LINK_TEST_TRANSACTION_NAME,
} from '../../fixtures/constants';

test.describe.serial('Custom links template validation', { tag: ['@ess', '@svlOblt'] }, () => {
  const uniqueLabel = `template-test-${randomUUID()}`;
  const templateUrl =
    'http://scoutURLExample.com/ftw/app/apm/services/{{service.name}}/transactions/view?comparisonEnabled=true&environment={{service.environment}}';
  const expectedUrl = `http://scoutURLExample.com/ftw/app/apm/services/${SERVICE_CUSTOM_LINK_TEST}/transactions/view?comparisonEnabled=true&environment=${CUSTOM_LINK_TEST_ENVIRONMENT}`;

  test('Create custom link with template URL and filters', async ({
    page,
    pageObjects: { customLinksPage },
    browserAuth,
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    await customLinksPage.goto();
    await customLinksPage.clickCreateCustomLink();
    await expect(page.getByRole('heading', { name: 'Create link', level: 2 })).toBeVisible();

    await customLinksPage.fillLabel(uniqueLabel);
    await customLinksPage.fillUrl(templateUrl);

    // Add service.name filter
    await customLinksPage.addFilter('service.name', SERVICE_CUSTOM_LINK_TEST);

    // Add service.environment filter
    await customLinksPage.addFilter('service.environment', CUSTOM_LINK_TEST_ENVIRONMENT);

    await expect(customLinksPage.saveButton).toBeEnabled();
    await customLinksPage.clickSave();

    // Verify we're back on the main page and our link row appears in the table
    await expect(page).toHaveURL(/.*custom-links$/);
    await expect(customLinksPage.getCustomLinkRow(uniqueLabel)).toBeVisible({
      timeout: EXTENDED_TIMEOUT,
    });
  });

  test('Verify template variables are populated correctly in custom link URLs', async ({
    pageObjects: { transactionDetailsPage },
    browserAuth,
  }) => {
    await browserAuth.loginAsPrivilegedUser();

    // Navigate to transaction details page
    await transactionDetailsPage.goToTransactionDetails({
      serviceName: SERVICE_CUSTOM_LINK_TEST,
      transactionName: CUSTOM_LINK_TEST_TRANSACTION_NAME,
      start: testData.START_DATE,
      end: testData.END_DATE,
    });

    // Open action menu and verify template population
    await transactionDetailsPage.openActionMenu();

    // Get the href attribute of the custom link
    const actualHref = await transactionDetailsPage.getCustomLinkHref(uniqueLabel);

    // Verify the template variables are populated correctly
    expect(actualHref).toBe(expectedUrl);
  });

  test('Delete custom link with template URL', async ({
    page,
    pageObjects: { customLinksPage },
    browserAuth,
  }) => {
    await browserAuth.loginAsPrivilegedUser();
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
