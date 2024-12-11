/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'node:fs';
import path from 'node:path';
import { test } from './fixtures/base_page';
import { HostDetailsPage } from './pom/pages/host_details.page';
import { assertEnv } from '../lib/assert_env';

test.beforeEach(async ({ page }) => {
  await page.goto(`${process.env.KIBANA_BASE_URL}/app/observabilityOnboarding`);
});

test('Auto-detect logs and metrics', async ({ page, onboardingHomePage, autoDetectFlowPage }) => {
  assertEnv(process.env.ARTIFACTS_FOLDER, 'ARTIFACTS_FOLDER is not defined.');

  const fileName = 'code_snippet_logs_auto_detect.sh';
  const outputPath = path.join(__dirname, '..', process.env.ARTIFACTS_FOLDER, fileName);

  await onboardingHomePage.selectHostUseCase();
  await onboardingHomePage.selectAutoDetectWithElasticAgent();

  await autoDetectFlowPage.assertVisibilityCodeBlock();
  await autoDetectFlowPage.copyToClipboard();

  const clipboardData = (await page.evaluate('navigator.clipboard.readText()')) as string;

  /**
   * Ensemble story watches for the code snippet file
   * to be created and then executes it
   */
  fs.writeFileSync(outputPath, clipboardData);

  await autoDetectFlowPage.assertReceivedDataIndicator();
  await autoDetectFlowPage.clickAutoDetectSystemIntegrationCTA();

  /**
   * Host Details pages open in a new tab, so it
   * needs to be captured using the `popup` event.
   */
  const hostDetailsPage = new HostDetailsPage(await page.waitForEvent('popup'));

  /**
   * There is a glitch on the Hosts page where it can show "No data"
   * screen even though data is available and it can show it with a delay
   * after the Hosts page layout was loaded. This workaround waits for
   * the No Data screen to be visible, and if so - reloads the page.
   * If the No Data screen does not appear, the test can proceed normally.
   * Seems like some caching issue with the Hosts page.
   */
  try {
    await hostDetailsPage.noData().waitFor({ state: 'visible', timeout: 10000 });
    await hostDetailsPage.page.waitForTimeout(2000);
    await hostDetailsPage.page.reload();
  } catch {
    /* Ignore if "No Data" screen never showed up */
  }

  await hostDetailsPage.clickHostDetailsLogsTab();
  await hostDetailsPage.assertHostDetailsLogsStream();
});
