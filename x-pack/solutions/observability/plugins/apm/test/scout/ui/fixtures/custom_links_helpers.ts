/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import type { CustomLinksPage } from './page_objects/custom_links';
import { EXTENDED_TIMEOUT, PRODUCTION_ENVIRONMENT, SERVICE_SYNTH_NODE_1 } from './constants';

export const TEMPLATE_URL =
  'http://scoutURLExample.com/ftw/app/apm/services/{{service.name}}/transactions/view?comparisonEnabled=true&environment={{service.environment}}';

export const getExpectedTemplateUrl = (serviceName: string, environment: string) =>
  `http://scoutURLExample.com/ftw/app/apm/services/${serviceName}/transactions/view?comparisonEnabled=true&environment=${environment}`;

export const createTemplateLinkFromSettings = async (
  customLinksPage: CustomLinksPage,
  page: ScoutPage,
  label: string
) => {
  const expectedUrl = getExpectedTemplateUrl(SERVICE_SYNTH_NODE_1, PRODUCTION_ENVIRONMENT);

  await customLinksPage.goto();
  await customLinksPage.clickCreateCustomLink();
  await expect(page.getByRole('heading', { name: 'Create link', level: 2 })).toBeVisible();

  await customLinksPage.fillLabel(label);
  await customLinksPage.fillUrl(TEMPLATE_URL);
  await customLinksPage.addFirstFilter('service.name', SERVICE_SYNTH_NODE_1);
  await customLinksPage.addAdditionalFilter('service.environment', PRODUCTION_ENVIRONMENT);

  await expect(page.getByTestId('preview-url')).toContainText(expectedUrl, {
    timeout: EXTENDED_TIMEOUT,
  });
  await expect(customLinksPage.saveButton).toBeEnabled();
  await customLinksPage.clickSave();

  await expect(page).toHaveURL(/.*custom-links$/);
  await expect(customLinksPage.getCustomLinkRow(label)).toBeVisible({
    timeout: EXTENDED_TIMEOUT,
  });
};

export const deleteCustomLink = async (
  customLinksPage: CustomLinksPage,
  page: ScoutPage,
  label: string
) => {
  await customLinksPage.goto();
  await customLinksPage.clickEditCustomLinkForRow(label);
  await customLinksPage.clickDelete();

  await expect(page).toHaveURL(/.*custom-links$/);
  await expect(customLinksPage.getCustomLinkRow(label)).toBeHidden({
    timeout: EXTENDED_TIMEOUT,
  });
  await expect(page.getByTestId('euiToastHeader__title')).toHaveText('Deleted custom link.');
};

export const deleteCustomLinkIfExists = async (
  customLinksPage: CustomLinksPage,
  page: ScoutPage,
  label: string
) => {
  await customLinksPage.goto();
  const row = customLinksPage.getCustomLinkRow(label);
  if (await row.isVisible()) {
    await deleteCustomLink(customLinksPage, page, label);
  }
};
