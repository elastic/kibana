/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { expect, EuiComboBoxWrapper } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';
import {
  EXTENDED_TIMEOUT,
  PRODUCTION_ENVIRONMENT,
  SERVICE_OPBEANS_JAVA,
} from '../../fixtures/constants';

// Constants for template URL validation tests
const templateUrl =
  'http://scoutURLExample.com/ftw/app/apm/services/{{service.name}}/transactions/view?comparisonEnabled=true&environment={{service.environment}}';
const getExpectedUrl = (serviceName: string, environment: string) =>
  `http://scoutURLExample.com/ftw/app/apm/services/${serviceName}/transactions/view?comparisonEnabled=true&environment=${environment}`;

test.describe.serial('Custom links template validation', { tag: ['@ess', '@svlOblt'] }, () => {
  const uniqueLabel = `template-test-${randomUUID()}`;
  const defaultLabel = `template-test-default-${randomUUID()}`;
  const expectedUrl = getExpectedUrl(SERVICE_OPBEANS_JAVA, PRODUCTION_ENVIRONMENT);

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

    // Add first filter (uses existing empty filter row)
    await customLinksPage.addFirstFilter('service.name', SERVICE_OPBEANS_JAVA);

    // Add additional filter (explicitly adds new filter row)
    await customLinksPage.addAdditionalFilter('service.environment', PRODUCTION_ENVIRONMENT);

    await expect(page.getByTestId('preview-url')).toContainText(expectedUrl);

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
    page,
    browserAuth,
  }) => {
    await browserAuth.loginAsPrivilegedUser();

    await transactionDetailsPage.goToTransactionDetails({
      serviceName: testData.SERVICE_OPBEANS_JAVA,
      transactionName: testData.PRODUCT_TRANSACTION_NAME,
      start: testData.START_DATE,
      end: testData.END_DATE,
    });

    await page
      .getByRole('switch', { name: 'Show critical path' })
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });

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

  // Open transaction and validate the default url when creating a custom link
  test('Open transaction and validate the default url when creating a custom link', async ({
    page,
    pageObjects: { transactionDetailsPage, customLinksPage },
    browserAuth,
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    await transactionDetailsPage.goToTransactionDetails({
      serviceName: testData.SERVICE_OPBEANS_JAVA,
      transactionName: testData.PRODUCT_TRANSACTION_NAME,
      start: testData.START_DATE,
      end: testData.END_DATE,
    });

    await page
      .getByRole('switch', { name: 'Show critical path' })
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
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
    // Verify service.name filter value is pre-populated with SERVICE_OPBEANS_JAVA
    await page
      .getByTestId('service.name.value')
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    const serviceNameComboBox = new EuiComboBoxWrapper(page, {
      dataTestSubj: 'service.name.value',
    });
    const serviceNameValue = await serviceNameComboBox.getSelectedValue();
    expect(serviceNameValue).toBe(SERVICE_OPBEANS_JAVA);

    // Verify service.environment filter value is pre-populated with PRODUCTION_ENVIRONMENT
    await page
      .getByTestId('service.environment.value')
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    const serviceEnvComboBox = new EuiComboBoxWrapper(page, {
      dataTestSubj: 'service.environment.value',
    });
    const serviceEnvValue = await serviceEnvComboBox.getSelectedValue();
    expect(serviceEnvValue).toBe(PRODUCTION_ENVIRONMENT);

    // Fill in label and URL
    await customLinksPage.fillLabel(defaultLabel);
    await customLinksPage.fillUrl(templateUrl);

    // Verify preview URL shows correctly populated template variables
    await expect(page.getByTestId('preview-url')).toContainText(expectedUrl);

    // Save the custom link
    await expect(customLinksPage.saveButton).toBeEnabled();
    await customLinksPage.clickSave();

    await page
      .getByRole('switch', { name: 'Show critical path' })
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });

    await transactionDetailsPage.openActionMenu();
    await expect(page.getByRole('link', { name: defaultLabel })).toBeVisible({
      timeout: EXTENDED_TIMEOUT,
    });

    // Verify the link has the correct href with populated template variables
    const actualHref = await transactionDetailsPage.getCustomLinkHref(defaultLabel);
    expect(actualHref).toBe(expectedUrl);
  });

  test('Delete custom link created from transaction details', async ({
    page,
    pageObjects: { customLinksPage },
    browserAuth,
  }) => {
    await browserAuth.loginAsPrivilegedUser();
    await customLinksPage.goto();
    await customLinksPage.clickEditCustomLinkForRow(defaultLabel);
    await customLinksPage.clickDelete();

    // Verify deletion
    await expect(page).toHaveURL(/.*custom-links$/);
    await expect(customLinksPage.getCustomLinkRow(defaultLabel)).toBeHidden({
      timeout: EXTENDED_TIMEOUT,
    });

    await expect(page.getByTestId('euiToastHeader__title')).toHaveText('Deleted custom link.');
  });
});
