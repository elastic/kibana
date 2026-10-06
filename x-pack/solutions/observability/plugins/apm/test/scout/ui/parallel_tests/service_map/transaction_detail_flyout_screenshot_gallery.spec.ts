/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * TEMP — delete before merge. Not a real assertion suite: it drives the transaction detail
 * flyout (the child of the service flyout) into a few visual states and writes screenshots for
 * the PR's before/after gallery. Run with FLYOUT_SHOT_RUN=before against the pre-migration
 * flyout and FLYOUT_SHOT_RUN=after against the migrated one. Output lands in the gitignored
 * .playwright-mcp/flyout-migration/txn-detail/<run>/ directory.
 */

import { faker } from '@faker-js/faker';
import type { Locator, ScoutPage } from '@kbn/scout-oblt';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';
import type { ExtendedScoutTestFixtures } from '../../fixtures';
import {
  EXTENDED_TIMEOUT,
  PRODUCT_TRANSACTION_NAME,
  SERVICE_MAP_KUERY_OPBEANS,
  SERVICE_OPBEANS_JAVA,
} from '../../fixtures/constants';

const RUN = process.env.FLYOUT_SHOT_RUN ?? 'before';
const shotPath = (name: string) =>
  `.playwright-mcp/flyout-migration/txn-detail/${RUN}/${name}.png`;

const RULE_NAME = `Transaction detail flyout gallery ${faker.string.uuid()}`;
const APM_ALERTS_INDEX_PATTERN = '.alerts-observability.apm.alerts-*';
const STATEFUL_ALERTS_INDEX = '.internal.alerts-observability.apm.alerts-default-000001';
const RULE_TYPE_ID = 'apm.error_rate';
/** Inside the opbeans synthtrace window used by the service map tests. */
const ALERT_TIMESTAMP = '2021-10-10T00:07:30.000Z';

async function openTransactionDetailFlyout(page: ScoutPage): Promise<Locator> {
  const row = page
    .getByTestId('serviceFlyoutSection-transactions')
    .getByRole('row')
    .filter({ hasText: PRODUCT_TRANSACTION_NAME });
  await row
    .getByTestId('apmTransactionsTableExpandButton')
    .click({ timeout: EXTENDED_TIMEOUT });

  const nested = page.testSubj.locator('transactionDetailFlyout');
  await expect(nested).toBeVisible({ timeout: EXTENDED_TIMEOUT });
  // Guard the side-by-side layout (one close button per flyout); a stacked layout would
  // silently capture the wrong thing.
  await expect(page.testSubj.locator('euiFlyoutCloseButton')).toHaveCount(2);
  return nested;
}

async function scrollFlyoutBodyToBottom(flyout: Locator) {
  await expect
    .poll(
      () =>
        flyout.evaluate((el) => {
          const scroller = Array.from(el.querySelectorAll('*')).find(
            (child) =>
              child.scrollHeight > child.clientHeight + 20 &&
              /(auto|scroll)/.test(getComputedStyle(child).overflowY)
          );
          if (!scroller) return 0;
          scroller.scrollTop = scroller.scrollHeight;
          return scroller.scrollTop;
        }),
      { timeout: EXTENDED_TIMEOUT }
    )
    .toBeGreaterThan(0);
}

test.describe(
  'Transaction detail flyout — screenshot gallery (TEMP)',
  { tag: tags.stateful.classic },
  () => {
    test.use({ viewport: { width: 1600, height: 1200 } });

    test.afterAll(async ({ apiServices, esClient }) => {
      const findResponse = await apiServices.alerting.rules.find({
        search: RULE_NAME,
        search_fields: ['name'],
        per_page: 1,
      });
      for (const rule of findResponse.data.data) {
        await esClient
          .deleteByQuery({
            index: APM_ALERTS_INDEX_PATTERN,
            query: { term: { 'kibana.alert.rule.uuid': rule.id } },
            refresh: true,
            conflicts: 'proceed',
          })
          .catch(() => {});
        await apiServices.alerting.rules.delete(rule.id).catch(() => {});
      }
    });

    async function openServiceFlyout({
      page,
      serviceMapPage,
      serviceFlyoutPage,
    }: {
      page: ScoutPage;
      serviceMapPage: ExtendedScoutTestFixtures['pageObjects']['serviceMapPage'];
      serviceFlyoutPage: ExtendedScoutTestFixtures['pageObjects']['serviceFlyoutPage'];
    }) {
      await serviceMapPage.gotoWithDateSelected(testData.START_DATE, testData.END_DATE, {
        kuery: SERVICE_MAP_KUERY_OPBEANS,
      });
      await serviceMapPage.waitForMapToLoad();
      await serviceMapPage.dismissPopoverIfOpen();
      await serviceMapPage.closeOptionsPanelIfOpen();
      await serviceMapPage.settleServiceMapLayout();
      await serviceMapPage.clickFitView();
      await serviceMapPage.waitForServiceNodeToLoad(SERVICE_OPBEANS_JAVA);
      await serviceMapPage.openServiceNodeFlyout(SERVICE_OPBEANS_JAVA);
      await expect(serviceFlyoutPage.flyout).toBeVisible();
      await expect(serviceFlyoutPage.transactionsSection).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
      await expect(page.getByTestId('serviceFlyoutSection-transactions')).toContainText(
        PRODUCT_TRANSACTION_NAME,
        { timeout: EXTENDED_TIMEOUT }
      );
    }

    test('captures transaction detail flyout variations', async ({
      page,
      browserAuth,
      pageObjects: { serviceMapPage, serviceFlyoutPage },
    }) => {
      await browserAuth.loginAsViewer();
      await openServiceFlyout({ page, serviceMapPage, serviceFlyoutPage });

      const nested = await test.step('nested flyout beside the service flyout', async () => {
        const flyout = await openTransactionDetailFlyout(page);
        await expect(
          flyout.getByTestId('transactionDetailFlyoutSection-latencyDistribution')
        ).toBeVisible({ timeout: EXTENDED_TIMEOUT });
        await page.screenshot({ path: shotPath('nested'), animations: 'disabled' });
        return flyout;
      });

      await test.step('footer actions menu open', async () => {
        await nested.getByTestId('transactionDetailFlyoutActionsButton').click();
        await page.testSubj
          .locator('transactionDetailFlyoutActionsMenuItem-openTransactionDetails')
          .waitFor({ state: 'visible' });
        await page.screenshot({ path: shotPath('footer-menu'), animations: 'disabled' });
        await page.keyboard.press('Escape');
      });

      await test.step('header collapsed on scroll', async () => {
        await page.setViewportSize({ width: 1600, height: 600 });
        await scrollFlyoutBodyToBottom(nested);
        // Best effort: only the migrated flyout collapses its header.
        await nested
          .locator('[data-test-subj="flyoutHeaderCollapsibleRegion"][inert]')
          .waitFor({ state: 'attached', timeout: EXTENDED_TIMEOUT })
          .catch(() => {});
        await page.screenshot({ path: shotPath('header-collapsed'), animations: 'disabled' });
        await page.setViewportSize({ width: 1600, height: 1200 });
      });
    });

    test('captures the alerts badge', async ({
      page,
      browserAuth,
      apiServices,
      esClient,
      pageObjects: { serviceMapPage, serviceFlyoutPage },
    }) => {
      await test.step('seed an active alert scoped to the transaction', async () => {
        const response = await apiServices.alerting.rules.create({
          ruleTypeId: RULE_TYPE_ID,
          name: RULE_NAME,
          consumer: 'apm',
          schedule: { interval: '1m' },
          enabled: false,
          params: {
            environment: 'production',
            threshold: 0,
            windowSize: 1,
            windowUnit: 'h',
          },
          tags: ['apm'],
        });
        const ruleId = response.data.id;

        await esClient.index({
          index: STATEFUL_ALERTS_INDEX,
          refresh: 'wait_for',
          document: {
            '@timestamp': ALERT_TIMESTAMP,
            'kibana.alert.uuid': faker.string.uuid(),
            'kibana.alert.start': ALERT_TIMESTAMP,
            'kibana.alert.status': 'active',
            'kibana.alert.workflow_status': 'open',
            'kibana.alert.rule.name': RULE_NAME,
            'kibana.alert.rule.uuid': ruleId,
            'kibana.alert.rule.rule_type_id': RULE_TYPE_ID,
            'kibana.alert.rule.category': RULE_NAME,
            'kibana.alert.rule.consumer': 'apm',
            'kibana.alert.reason': `Failed transactions rate is 100% for ${PRODUCT_TRANSACTION_NAME}`,
            'kibana.alert.evaluation.threshold': 0,
            'kibana.alert.evaluation.value': 100,
            'kibana.alert.duration.us': 0,
            'kibana.alert.time_range': { gte: ALERT_TIMESTAMP, lte: ALERT_TIMESTAMP },
            'kibana.alert.instance.id': '*',
            'service.name': SERVICE_OPBEANS_JAVA,
            'service.environment': 'production',
            'transaction.type': 'request',
            'transaction.name': PRODUCT_TRANSACTION_NAME,
            'processor.event': 'transaction',
            'kibana.space_ids': ['default'],
            'event.kind': 'signal',
            'event.action': 'open',
            tags: ['apm'],
          },
        });
      });

      await browserAuth.loginAsAdmin();
      await openServiceFlyout({ page, serviceMapPage, serviceFlyoutPage });
      const nested = await openTransactionDetailFlyout(page);

      await test.step('alerts badge in the header', async () => {
        const badge = nested.getByTestId('transactionDetailFlyoutAlertsBadge');
        await expect(badge).toBeVisible({ timeout: EXTENDED_TIMEOUT });
        await expect(badge).toHaveText('1');
        await page.screenshot({ path: shotPath('header-alerts-badge'), animations: 'disabled' });
      });

      await test.step('alerts badge tooltip', async () => {
        await nested.getByTestId('transactionDetailFlyoutAlertsBadge').hover();
        await expect(page.getByRole('tooltip')).toBeVisible();
        await page.screenshot({
          path: shotPath('header-alerts-badge-tooltip'),
          animations: 'disabled',
        });
      });
    });
  }
);
