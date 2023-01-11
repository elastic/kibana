/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, expect, Page } from '@elastic/synthetics';
import { assertText, byTestId } from '@kbn/observability-plugin/e2e/utils';
import { RetryService } from '@kbn/ftr-common-functional-services';
import { recordVideo } from '@kbn/observability-plugin/e2e/record_video';
import { syntheticsAppPageProvider } from '../../page_objects/synthetics/synthetics_app';

let page1: Page;
journey(`DataRetentionPage`, async ({ page, params }) => {
  page.setDefaultTimeout(60 * 1000);
  recordVideo(page);
  const syntheticsApp = syntheticsAppPageProvider({ page, kibanaUrl: params.kibanaUrl });

  const getService = params.getService;
  const retry: RetryService = getService('retry');

  step('Go to monitor-management', async () => {
    await syntheticsApp.navigateToMonitorManagement(true);
  });

  step('validate data retention tab', async () => {
    await page.click('text=Settings');
    expect(page.url()).toBe('http://localhost:5620/app/synthetics/settings/alerting');
    await page.click('text=Data retention');
    expect(page.url()).toBe('http://localhost:5620/app/synthetics/settings/data-retention');
    await page.click('text=Synthetics data is configured by managed index lifecycle policies');

    await page.click('text=0 Bytes');
    await page.click('text=365 days + rollover');
    await page.click('text=14 days + rollover');
    await page.click(':nth-match(:text("14 days + rollover"), 2)');
    await page.click(':nth-match(:text("365 days + rollover"), 2)');
    await page.click(':nth-match(:text("365 days + rollover"), 3)');
    await page.click(':nth-match(:text("365 days + rollover"), 4)');
    await page.click('tbody div:has-text("synthetics(opens in a new tab or window)")');
  });

  step('validate data sizes', async () => {
    const allChecks = await page.textContent(`tr:has-text("All Checks") span:has-text("KB")`);
    const browserChecks = await page.textContent(
      `tr:has-text("Browser Checks") span:has-text("KB")`
    );
    const networkChecks = await page.textContent(
      `tr:has-text("Browser Network Requests") span:has-text("KB")`
    );
    const screenshotChecks = await page.textContent(
      `tr:has-text("Browser Screenshots") span:has-text("KB")`
    );
    expect(Number(allChecks?.split('KB')[0])).toBeGreaterThan(450);
    expect(Number(browserChecks?.split('KB')[0])).toBeGreaterThan(50);
    expect(Number(networkChecks?.split('KB')[0])).toBeGreaterThan(300);
    expect(Number(screenshotChecks?.split('KB')[0])).toBeGreaterThan(25);
  });

  step('it can click through for policy', async () => {
    [page1] = await Promise.all([
      page.waitForEvent('popup'),
      page.click(
        'tbody div:has-text("synthetics-synthetics.browser-default_policy(opens in a new tab or window)")'
      ),
    ]);
    recordVideo(page1, 'data_retention_policy_change');
    await page1.setDefaultTimeout(60 * 1000);
    await page1.click('text=Edit policy synthetics-synthetics.browser-default_policy');
    await page1.click('text=Save as new policy');
  });

  step('newly created policy is reflected in settings', async () => {
    await page1.fill(
      byTestId('policyNameField'),
      'synthetics-synthetics.browser-default_policy-copy'
    );
    await page1.fill(byTestId('delete-selectedMinimumAge'), '10000');

    await page1.click(byTestId('savePolicyButton'));

    await page1.click('text=Include managed system policies');

    await page1.fill(byTestId('ilmSearchBar'), 'copy');

    await retry.tryForTime(30 * 1000, async () => {
      await page1.click(byTestId('addPolicyToTemplate'), { clickCount: 2, timeout: 5000 });
      expect(await page1.isVisible(byTestId('confirmModalConfirmButton'), { timeout: 5000 })).toBe(
        true
      );
    });

    await page1.click(byTestId('comboBoxToggleListButton'));
    await page1.fill(byTestId('comboBoxSearchInput'), 'synthetics-browser');

    await page1.click('button[title="synthetics-browser"]');

    await page1.click(byTestId('confirmModalConfirmButton'));

    await page.reload();

    await page.click('tbody div:has-text("synthetics(opens in a new tab or window)")');
    await page1.close();

    await assertText({ page, text: '10000 days + rollover' });
  });
});
