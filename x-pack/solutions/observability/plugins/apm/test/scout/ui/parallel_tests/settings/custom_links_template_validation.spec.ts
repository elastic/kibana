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
  createTemplateLinkFromSettings,
  deleteCustomLinkIfExists,
  getExpectedTemplateUrl,
  TEMPLATE_URL,
} from '../../fixtures/custom_links_helpers';
import {
  EXTENDED_TIMEOUT,
  PRODUCTION_ENVIRONMENT,
  SERVICE_SYNTH_NODE_1,
} from '../../fixtures/constants';

test.describe(
  'Custom links template validation',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const createdLabels = new Set<string>();

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterEach(async ({ page, pageObjects: { customLinksPage } }) => {
      for (const label of createdLabels) {
        await deleteCustomLinkIfExists(customLinksPage, page, label);
      }
      createdLabels.clear();
    });

    test('creates custom link with template URL and filters from settings', async ({
      page,
      pageObjects: { customLinksPage },
    }) => {
      const uniqueLabel = `template-test-${randomUUID()}`;
      createdLabels.add(uniqueLabel);

      await createTemplateLinkFromSettings(customLinksPage, page, uniqueLabel);
    });

    test('populates template variables in transaction custom link URLs', async ({
      page,
      pageObjects: { customLinksPage, transactionDetailsPage },
    }) => {
      const uniqueLabel = `template-test-${randomUUID()}`;
      createdLabels.add(uniqueLabel);
      const expectedUrl = getExpectedTemplateUrl(SERVICE_SYNTH_NODE_1, PRODUCTION_ENVIRONMENT);

      await createTemplateLinkFromSettings(customLinksPage, page, uniqueLabel);

      await transactionDetailsPage.goToTransactionDetails({
        serviceName: testData.SERVICE_SYNTH_NODE_1,
        transactionName: testData.APPLE_TRANSACTION_NAME,
        start: 'now-1h',
        end: 'now',
      });
      await expect(page.getByTestId('criticalPathToggle')).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });

      await transactionDetailsPage.openActionMenu();
      expect(await transactionDetailsPage.getCustomLinkHref(uniqueLabel)).toBe(expectedUrl);
    });

    test('creates custom link from transaction details with prefilled filters', async ({
      page,
      pageObjects: { transactionDetailsPage, customLinksPage },
    }) => {
      const defaultLabel = `template-test-default-${randomUUID()}`;
      createdLabels.add(defaultLabel);
      const expectedUrl = getExpectedTemplateUrl(SERVICE_SYNTH_NODE_1, PRODUCTION_ENVIRONMENT);

      await transactionDetailsPage.goToTransactionDetails({
        serviceName: testData.SERVICE_SYNTH_NODE_1,
        transactionName: testData.APPLE_TRANSACTION_NAME,
        start: 'now-1h',
        end: 'now',
      });
      await expect(page.getByTestId('criticalPathToggle')).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
      await transactionDetailsPage.openActionMenu();

      const createButton = page
        .getByTestId('apmCustomLinkToolbarCreateButton')
        .or(page.getByTestId('apmBottomSectionCreateCustomLinkButton'));
      await expect(createButton).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      await createButton.click();

      await expect(page.getByRole('heading', { name: 'Create link', level: 2 })).toBeVisible();

      await expect(page.getByTestId('service.name.value')).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
      const serviceNameComboBox = new EuiComboBoxWrapper(page, {
        dataTestSubj: 'service.name.value',
      });
      expect(await serviceNameComboBox.getSelectedValue()).toBe(SERVICE_SYNTH_NODE_1);

      await expect(page.getByTestId('service.environment.value')).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
      const serviceEnvComboBox = new EuiComboBoxWrapper(page, {
        dataTestSubj: 'service.environment.value',
      });
      expect(await serviceEnvComboBox.getSelectedValue()).toBe(PRODUCTION_ENVIRONMENT);

      await customLinksPage.fillLabel(defaultLabel);
      await customLinksPage.fillUrl(TEMPLATE_URL);

      await expect(page.getByTestId('preview-url')).toContainText(expectedUrl, {
        timeout: EXTENDED_TIMEOUT,
      });
      await expect(customLinksPage.saveButton).toBeEnabled();
      await customLinksPage.clickSave();

      await transactionDetailsPage.openActionMenu();
      await expect(page.getByRole('link', { name: defaultLabel })).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
      expect(await transactionDetailsPage.getCustomLinkHref(defaultLabel)).toBe(expectedUrl);
    });
  }
);
