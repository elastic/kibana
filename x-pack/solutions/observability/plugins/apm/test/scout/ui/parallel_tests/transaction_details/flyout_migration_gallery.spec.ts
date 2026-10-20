/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * TEMP — delete before merge.
 *
 * Before/after screenshot gallery for the waterfall transaction and span flyouts.
 * Writes PNGs to `.playwright-mcp/flyout-migration/<FLYOUT_SHOT_RUN>/`.
 * Tagged `@local-stateful-classic` because Scout rejects untagged tests. Skipped unless
 * FLYOUT_SHOT_RUN is set, so CI does not execute it.
 *
 * From the repo root, against a running stateful server:
 *   FLYOUT_SHOT_RUN=before node scripts/playwright test \
 *     --config x-pack/solutions/observability/plugins/apm/test/scout/ui/parallel.playwright.config.ts \
 *     --project local \
 *     --grep "flyout migration gallery"
 */

import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import type { ScoutPage } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';

const RUN = process.env.FLYOUT_SHOT_RUN;

function repoRoot(): string {
  let dir = process.cwd();
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, '.nvmrc')) && existsSync(join(dir, 'package.json'))) {
      return dir;
    }
    dir = dirname(dir);
  }
  return process.cwd();
}

const OUT_DIR = join(repoRoot(), '.playwright-mcp/flyout-migration', RUN ?? 'before');

const DB_SPAN_NAME = 'SELECT * FROM product';

async function shot(page: ScoutPage, name: string) {
  mkdirSync(OUT_DIR, { recursive: true });
  await page.screenshot({
    path: join(OUT_DIR, `${name}.png`),
    animations: 'disabled',
  });
}

function flyout(page: ScoutPage) {
  return page.getByRole('dialog').last();
}

async function clickWaterfallRow(page: ScoutPage, name: string) {
  const row = page
    .getByTestId('waterfall')
    .getByTestId('traceItemRowContent')
    .filter({ hasText: name })
    .first();
  await row.waitFor({ state: 'visible', timeout: testData.EXTENDED_TIMEOUT });
  await row.click();
}

async function waitForMetadataTab(page: ScoutPage) {
  await expect(flyout(page).getByRole('tab', { name: 'Metadata' })).toBeVisible({
    timeout: testData.EXTENDED_TIMEOUT,
  });
}

async function holdRequests(page: ScoutPage, matches: (url: URL) => boolean) {
  let open = true;
  const pending: Array<() => void> = [];
  await page.route(matches, async (route) => {
    if (open) {
      await new Promise<void>((resolve) => pending.push(resolve));
    }
    await route.continue().catch(() => undefined);
  });
  return () => {
    open = false;
    pending.splice(0).forEach((release) => release());
  };
}

const isTransactionDocument = (url: URL) =>
  /\/internal\/apm\/traces\/[^/]+\/transactions\/[^/]+$/.test(url.pathname);

const isSpanDocument = (url: URL) =>
  /\/internal\/apm\/traces\/[^/]+\/spans\/[^/]+$/.test(url.pathname);

async function closeFlyout(page: ScoutPage) {
  const closeButton = page.getByTestId('euiFlyoutCloseButton');
  if ((await closeButton.count()) === 0) {
    return;
  }
  await closeButton.last().click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

async function scrollFlyoutBody(page: ScoutPage): Promise<boolean> {
  return page.evaluate(() => {
    const dialogs = Array.from(document.querySelectorAll('[role="dialog"]'));
    const dialog = dialogs[dialogs.length - 1];
    if (!dialog) {
      return false;
    }

    const overflow = dialog.querySelector('.euiFlyoutBody__overflow');
    const candidates = overflow
      ? [overflow]
      : Array.from(dialog.querySelectorAll<HTMLElement>('*')).filter((el) => {
          const style = getComputedStyle(el);
          return style.overflowY === 'auto' || style.overflowY === 'scroll';
        });

    const target = candidates
      .map((el) => el as HTMLElement)
      .sort((a, b) => b.scrollHeight - a.scrollHeight)[0];

    if (!target || target.scrollHeight <= target.clientHeight + 8) {
      return false;
    }

    target.scrollTop = target.scrollHeight;
    target.dispatchEvent(new Event('scroll'));
    return true;
  });
}

test.describe('flyout migration gallery', { tag: tags.stateful.classic }, () => {
  test.skip(!RUN, 'Set FLYOUT_SHOT_RUN to capture the gallery');
  test.describe.configure({ timeout: 180_000 });
  test.use({ viewport: { width: 1600, height: 1200 } });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('transaction flyout', async ({ page, pageObjects: { transactionDetailsPage } }) => {
    await transactionDetailsPage.goToTransactionDetails({
      serviceName: testData.SERVICE_OPBEANS_JAVA,
      transactionName: testData.PRODUCT_TRANSACTION_NAME,
      start: testData.START_DATE,
      end: testData.END_DATE,
    });

    await test.step('open', async () => {
      await clickWaterfallRow(page, testData.PRODUCT_TRANSACTION_NAME);
      await waitForMetadataTab(page);
      await expect(page.testSubj.locator('transactionFlyoutInfo-name')).toBeVisible();
      await expect(page.testSubj.locator('transactionFlyoutInfo-request')).toBeVisible();
      await shot(page, 'txn-open');
    });

    await test.step('investigate menu', async () => {
      const dialog = flyout(page);
      const investigate = dialog
        .getByTestId('transactionFlyoutActionsButton')
        .or(dialog.getByTestId('apmActionMenuButtonInvestigateButton'));
      await expect(investigate).toBeVisible({ timeout: testData.EXTENDED_TIMEOUT });
      await investigate.click();
      const menu = page.getByTestId('transactionFlyoutActionsButtonPanel');
      await expect(menu.getByRole('heading', { name: 'Trace details' })).toBeVisible({
        timeout: testData.EXTENDED_TIMEOUT,
      });
      await shot(page, 'txn-investigate');
      await page.keyboard.press('Escape');
    });

    await test.step('collapsed header', async () => {
      await page.setViewportSize({ width: 1600, height: 600 });
      if ((await page.getByRole('dialog').count()) === 0) {
        await clickWaterfallRow(page, testData.PRODUCT_TRANSACTION_NAME);
        await waitForMetadataTab(page);
      }
      await expect
        .poll(async () => scrollFlyoutBody(page), { timeout: 8000 })
        .toBe(true)
        .catch(() => undefined);
      await page.waitForTimeout(500);
      await shot(page, 'txn-collapsed');
      await page.setViewportSize({ width: 1600, height: 1200 });
    });
  });

  test('transaction flyout short request', async ({
    page,
    pageObjects: { transactionDetailsPage },
  }) => {
    await transactionDetailsPage.goToTransactionDetails({
      serviceName: testData.SERVICE_OPBEANS_NODE,
      transactionName: testData.PRODUCT_BY_ID_TRANSACTION_NAME,
      start: testData.START_DATE,
      end: testData.END_DATE,
    });

    await clickWaterfallRow(page, testData.PRODUCT_BY_ID_TRANSACTION_NAME);
    await waitForMetadataTab(page);
    await expect(page.testSubj.locator('transactionFlyoutInfo-request')).toHaveText(
      /GET elastic\.co/
    );
    await expect(page.testSubj.locator('transactionFlyoutInfo-response')).toHaveText(/200/);
    await shot(page, 'txn-open-short-request');
  });

  test('span flyout request', async ({ page, pageObjects: { transactionDetailsPage } }) => {
    await transactionDetailsPage.goToTransactionDetails({
      serviceName: testData.SERVICE_OPBEANS_JAVA,
      transactionName: testData.PRODUCT_TRANSACTION_NAME,
      start: testData.START_DATE,
      end: testData.END_DATE,
    });

    await clickWaterfallRow(page, 'GET opbeans-node');
    await waitForMetadataTab(page);
    await expect(page.testSubj.locator('spanFlyoutInfo-request')).toBeVisible();
    await expect(page.testSubj.locator('spanFlyoutInfo-response')).toHaveText(/503/);
    await shot(page, 'span-open-request');
  });

  test('span flyout short request', async ({ page, pageObjects: { transactionDetailsPage } }) => {
    await transactionDetailsPage.goToTransactionDetails({
      serviceName: testData.SERVICE_OPBEANS_JAVA,
      transactionName: testData.PRODUCT_TRANSACTION_NAME,
      start: testData.START_DATE,
      end: testData.END_DATE,
    });

    await clickWaterfallRow(page, 'GET opbeans-go');
    await waitForMetadataTab(page);
    await expect(page.testSubj.locator('spanFlyoutInfo-request')).toHaveText(
      /GET http:\/\/opbeans-go:3000\/api\/cart/
    );
    await expect(page.testSubj.locator('spanFlyoutInfo-response')).toHaveText(/200/);
    await shot(page, 'span-open-short-request');
  });

  test('span flyout database statement', async ({
    page,
    pageObjects: { transactionDetailsPage },
  }) => {
    await transactionDetailsPage.goToTransactionDetails({
      serviceName: testData.SERVICE_OPBEANS_JAVA,
      transactionName: testData.PRODUCT_TRANSACTION_NAME,
      start: testData.START_DATE,
      end: testData.END_DATE,
    });

    await test.step('open', async () => {
      await clickWaterfallRow(page, DB_SPAN_NAME);
      await waitForMetadataTab(page);
      await expect(flyout(page).getByText('Database statement')).toBeVisible({
        timeout: testData.EXTENDED_TIMEOUT,
      });
      await shot(page, 'span-open');
    });

    await test.step('other tab', async () => {
      await flyout(page).getByRole('tab', { name: 'Stack Trace' }).click();
      await expect(flyout(page).getByRole('tab', { name: 'Stack Trace' })).toHaveAttribute(
        'aria-selected',
        'true'
      );
      await shot(page, 'span-other-tab');
    });
  });

  test('span stacktrace', async ({ page, pageObjects: { transactionDetailsPage } }) => {
    await transactionDetailsPage.goToTransactionDetails({
      serviceName: 'apm-generated',
      transactionName: 'Transaction A',
      start: testData.SPAN_LINKS_START_DATE,
      end: testData.SPAN_LINKS_END_DATE,
    });

    await page.getByText('Span A').click();
    await transactionDetailsPage.getStacktraceTab().click();
    await expect(
      page.getByText(
        'at org.apache.catalina.connector.OutputBuffer.flushByteBuffer(OutputBuffer.java:825)'
      )
    ).toBeVisible({ timeout: testData.EXTENDED_TIMEOUT });
    await shot(page, 'span-stacktrace');
    await closeFlyout(page);
  });

  test('span links', async ({ page, pageObjects: { dependencyDetailsPage } }) => {
    await dependencyDetailsPage.operationDetailSubpage.goToPage();
    await dependencyDetailsPage.operationDetailSubpage.waterfallPaginationLastButton.click();
    await dependencyDetailsPage.operationDetailSubpage.waterfallSpanLinksBadge.click();
    const dialog = flyout(page);
    await expect(dialog.getByRole('tab', { name: 'Span links' })).toBeVisible({
      timeout: testData.EXTENDED_TIMEOUT,
    });
    await expect(dialog.getByRole('columnheader', { name: 'Span duration' })).toBeVisible({
      timeout: testData.EXTENDED_TIMEOUT,
    });
    await shot(page, 'span-links');
  });

  test('loading states', async ({ page, pageObjects: { transactionDetailsPage } }) => {
    await transactionDetailsPage.goToTransactionDetails({
      serviceName: testData.SERVICE_OPBEANS_JAVA,
      transactionName: testData.PRODUCT_TRANSACTION_NAME,
      start: testData.START_DATE,
      end: testData.END_DATE,
    });

    await test.step('transaction', async () => {
      const release = await holdRequests(page, isTransactionDocument);
      await clickWaterfallRow(page, testData.PRODUCT_TRANSACTION_NAME);
      const dialog = flyout(page);
      await expect(dialog.getByRole('heading', { name: 'Transaction details' })).toBeVisible({
        timeout: testData.EXTENDED_TIMEOUT,
      });
      await expect(dialog.getByRole('progressbar').first()).toBeVisible();
      await shot(page, 'txn-loading');
      release();
      await closeFlyout(page);
    });

    await test.step('span', async () => {
      const release = await holdRequests(page, isSpanDocument);
      await clickWaterfallRow(page, DB_SPAN_NAME);
      const dialog = flyout(page);
      await expect(dialog.getByRole('heading', { name: 'Span details' })).toBeVisible({
        timeout: testData.EXTENDED_TIMEOUT,
      });
      await expect(dialog.getByRole('progressbar').first()).toBeVisible();
      await shot(page, 'span-loading');
      release();
    });
  });
});
