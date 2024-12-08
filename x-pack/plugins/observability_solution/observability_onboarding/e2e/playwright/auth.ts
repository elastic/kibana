/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as ess_auth, expect } from '@playwright/test';
import { STORAGE_STATE } from './playwright.config';
import { waitForOneOf } from './helpers';
import { log } from './lib/logger';
const isLocalCluster = process.env.CLUSTER_ENVIRONMENT === 'local';

ess_auth('Authentication', async ({ page }) => {
  await page.goto(process.env.KIBANA_HOST ?? '');
  log.info(`...waiting for login page elements to appear.`);
  if (!isLocalCluster) {
    await page.getByRole('button', { name: 'Log in with Elasticsearch' }).click();
  }
  await page.getByLabel('Username').fill(process.env.KIBANA_USERNAME ?? '');
  await page.getByLabel('Password', { exact: true }).click();
  await page.getByLabel('Password', { exact: true }).fill(process.env.KIBANA_PASSWORD ?? '');
  await page.getByRole('button', { name: 'Log in' }).click();

  const [index] = await waitForOneOf([
    page.locator('xpath=//div[@data-test-subj="helpMenuButton"]'),
    page.locator('xpath=//h1[contains(text(),"Select your space")]'),
    page.locator('xpath=//div[@data-test-subj="loginErrorMessage"]'),
  ]);

  const spaceSelector = index === 1;
  const isAuthenticated = index === 0;

  if (isAuthenticated) {
    await page.context().storageState({ path: STORAGE_STATE });
  } else if (spaceSelector) {
    await page.locator('xpath=//a[contains(text(),"Default")]').click();
    await expect(page.locator('xpath=//div[@data-test-subj="helpMenuButton"]')).toBeVisible();
    await page.context().storageState({ path: STORAGE_STATE });
  } else {
    log.error('Username or password is incorrect.');
    throw new Error('Authentication is failed.');
  }
});
