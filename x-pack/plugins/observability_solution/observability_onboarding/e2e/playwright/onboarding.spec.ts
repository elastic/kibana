/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'node:fs';
import path from 'node:path';
import { test } from './fixtures/base_page';
import { spaceSelectorStateful, waitForOneOf } from './helpers';
import { log } from './lib/logger';
import { HostsPage } from './pom/pages/hosts.page';

const inputFilePath = process.env.REPORT_FILE ?? '';
const outputDirectory = path.dirname(inputFilePath);

test.beforeEach(async ({ headerBar, page, sideNav, spaceSelector }) => {
  await sideNav.goto();
  await spaceSelectorStateful(headerBar, spaceSelector);
  await page.goto(`${process.env.KIBANA_HOST}/app/observabilityOnboarding`);
});

test('Auto-detect logs and metrics', async ({ onboardingPage, page }) => {
  const fileName = 'code_snippet_logs_auto_detect.sh';
  const outputPath = path.join(__dirname, outputDirectory, fileName);
  const maxRetries = 3;
  let retries = 0;
  let codeBlockAppeared = false;

  await onboardingPage.selectHost();
  await onboardingPage.selectAutoDetectWithElasticAgent();

  const [c] = await waitForOneOf([onboardingPage.codeBlock(), onboardingPage.contentNotLoaded()]);
  const codeNotLoaded = c === 1;

  if (codeNotLoaded) {
    while (retries < maxRetries) {
      try {
        onboardingPage.clickRetry();
        await onboardingPage.codeBlock().waitFor({ state: 'visible', timeout: 2000 });
        codeBlockAppeared = true;
        break;
      } catch (error) {
        retries++;
        log.error(`Code block visibility assertion attempt ${retries} failed. Retrying...`);
      }
    }
    if (!codeBlockAppeared) {
      throw new Error('Page content not loaded after 3 attempts.');
    }
  }
  await onboardingPage.assertVisibilityCodeBlock();
  await onboardingPage.copyToClipboard();

  const clipboardData = (await page.evaluate('navigator.clipboard.readText()')) as string;
  fs.writeFileSync(outputPath, clipboardData);

  await onboardingPage.assertReceivedDataIndicator();
  await onboardingPage.clickAutoDetectSystemIntegrationCTA();

  const hostsPage = new HostsPage(await page.waitForEvent('popup'));

  /**
   * There is a glitch on the Hosts page where it can show "No data"
   * screen even though data is available and it can show it with a delay
   * after the Hosts page layout was loaded. This workaround waits for
   * the No Data screen to be visible, and if so - reloads the page.
   * If the No Data screen does not appear, the test can proceed normally.
   * Seems like some caching issue with the Hosts page.
   */
  try {
    await hostsPage.noData().waitFor({ state: 'visible', timeout: 10000 });
    await hostsPage.page.reload();
  } catch {
    /* Ignore if No Data screen never showed up */
  }

  await hostsPage.clickHostDetailsLogsTab();
  await hostsPage.assertHostDetailsLogsStream();
});
