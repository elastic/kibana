/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, type Locator, type ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { apm, timerange } from '@kbn/synthtrace-client';
import type { ApmFields, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { test, testData } from '../../fixtures';
import {
  DEPENDENCY_POSTGRESQL,
  EDGE_OPBEANS_JAVA_TO_POSTGRESQL,
  PRODUCTION_ENVIRONMENT,
  EXTENDED_TIMEOUT,
  PRODUCT_TRANSACTION_NAME,
  SERVICE_MAP_KUERY_OPBEANS,
  SERVICE_OPBEANS_JAVA,
} from '../../fixtures/constants';
import type { ServiceMapPage } from '../../fixtures/page_objects/service_map';

const CAPTURE_DIR =
  process.env.FLYOUT_CAPTURE_DIR ??
  '/private/tmp/claude-501/-Users-tsullivan-elastic-kibana/e718fae4-22cc-42f8-9cbb-89e7499f84a2/scratchpad/captures';
const CAPTURE_PHASE = process.env.FLYOUT_CAPTURE_PHASE ?? 'after';
const capture = (page: ScoutPage, name: string) =>
  page.screenshot({ path: `${CAPTURE_DIR}/${CAPTURE_PHASE}/${name}.png`, animations: 'disabled' });

const ERRORS_SERVICE = 'flyout-capture-305245';
const ERRORS_EDGE = `${ERRORS_SERVICE}~>${DEPENDENCY_POSTGRESQL}`;

// The request flyout links a failed call to an APM error group only when the error document's
// `parent.id` is the failed exit span, which the shared opbeans data does not produce.
function failedExitSpanWithError({
  from,
  to,
}: {
  from: number;
  to: number;
}): SynthtraceGenerator<ApmFields> {
  const instance = apm
    .service({ name: ERRORS_SERVICE, environment: PRODUCTION_ENVIRONMENT, agentName: 'java' })
    .instance(`${ERRORS_SERVICE}-1`);

  return timerange(from, to)
    .ratePerMinute(10)
    .generator((timestamp) => {
      const span = instance
        .span({ spanName: 'SELECT * FROM capture', spanType: 'db', spanSubtype: 'postgresql' })
        .timestamp(timestamp)
        .duration(50)
        .failure()
        .destination(DEPENDENCY_POSTGRESQL);
      const error = instance
        .error({ message: 'Connection refused 305245', type: 'SQLException' })
        .timestamp(timestamp);
      const transaction = instance
        .transaction({ transactionName: 'GET /api/capture' })
        .timestamp(timestamp)
        .duration(200)
        .failure()
        .errors(error)
        .children(span);
      error.fields['parent.id'] = span.fields['span.id'];
      return transaction;
    });
}

const LOADING_SELECTOR = [
  '.euiLoadingSpinner',
  '.euiLoadingChart',
  '.euiLoadingElastic',
  '.euiSkeletonRectangle',
  '.euiSkeletonText',
  '.euiSkeletonTitle',
  '.euiSkeletonCircle',
  '.euiProgress',
].join(', ');

const settleFlyout = async (page: ScoutPage, root: Locator) => {
  await expect(root).toBeVisible({ timeout: EXTENDED_TIMEOUT });
  await expect(root.locator('.euiFlyoutHeader').getByRole('heading').first()).toBeVisible({
    timeout: EXTENDED_TIMEOUT,
  });
  // Lazy sections mount their spinners after the header, so require two consecutive empty polls.
  let emptyPolls = 0;
  await expect
    .poll(
      async () => {
        const count = await root.locator(LOADING_SELECTOR).count();
        emptyPolls = count === 0 ? emptyPolls + 1 : 0;
        return emptyPolls >= 2;
      },
      { timeout: EXTENDED_TIMEOUT, intervals: [500] }
    )
    .toBe(true)
    .catch(() => {});
  await page.mouse.move(0, 0);
  await page.waitForTimeout(1000);
};

test.describe(
  'Flyout template capture - APM',
  { tag: [...tags.stateful.classic] },
  () => {
    // Serial keeps the beforeAll ingest to a single worker, so document counts are stable.
    test.describe.configure({ mode: 'serial', timeout: 180_000 });
    test.use({ viewport: { width: 1600, height: 1200 } });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test.beforeAll(async ({ apmSynthtraceEsClient }) => {
      await apmSynthtraceEsClient.index(
        failedExitSpanWithError({
          from: new Date(testData.START_DATE).getTime(),
          to: new Date(testData.END_DATE).getTime(),
        })
      );
    });

    const openServiceMap = async (
      serviceMapPage: ServiceMapPage,
      kuery: string = SERVICE_MAP_KUERY_OPBEANS
    ) => {
      await serviceMapPage.gotoWithDateSelected(testData.START_DATE, testData.END_DATE, { kuery });
      await serviceMapPage.waitForMapToLoad();
      await serviceMapPage.dismissPopoverIfOpen();
      await serviceMapPage.closeOptionsPanelIfOpen();
      await serviceMapPage.settleServiceMapLayout();
      await serviceMapPage.clickFitView();
    };

    test('service flyout and transaction detail flyout', async ({
      page,
      pageObjects: { serviceMapPage },
    }) => {
      await openServiceMap(serviceMapPage);
      await serviceMapPage.waitForServiceNodeToLoad(SERVICE_OPBEANS_JAVA);
      await serviceMapPage.openServiceNodeFlyout(SERVICE_OPBEANS_JAVA);

      const serviceFlyout = page.testSubj.locator('serviceFlyout');
      await expect(page.testSubj.locator('serviceFlyoutSection-transactions-loaded')).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
      await settleFlyout(page, serviceFlyout);
      await capture(page, 'apm-01-service-flyout');

      const expandButton = serviceFlyout.getByTestId('apmTransactionsTableExpandButton').first();
      await expandButton.click();
      const transactionDetailFlyout = page.testSubj.locator('transactionDetailFlyout');
      await settleFlyout(page, transactionDetailFlyout);
      await capture(page, 'apm-08-transaction-detail-flyout');
    });

    test('request and operation detail flyouts', async ({
      page,
      pageObjects: { serviceMapPage },
    }) => {
      await openServiceMap(serviceMapPage);
      await serviceMapPage.waitForEdgeToLoad(EDGE_OPBEANS_JAVA_TO_POSTGRESQL);
      await serviceMapPage.openEdgeFlyout(EDGE_OPBEANS_JAVA_TO_POSTGRESQL);

      const requestFlyout = page.testSubj.locator('requestFlyout').first();
      await expect(page.testSubj.locator('requestFlyoutOperationNameLink').first()).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
      await settleFlyout(page, requestFlyout);
      await capture(page, 'apm-02-request-flyout');

      await test.step('operation detail flyout', async () => {
        await page.testSubj
          .locator('requestFlyoutOperationNameLink')
          .filter({ hasText: 'SELECT * FROM product' })
          .click();
        const operationFlyout = page.testSubj.locator('requestFlyoutOperationDetail');
        await settleFlyout(page, operationFlyout);
        await capture(page, 'apm-03-operation-detail-flyout');
      });
    });

    test('errors and error group flyouts', async ({ page, pageObjects: { serviceMapPage } }) => {
      await openServiceMap(serviceMapPage, `service.name: "${ERRORS_SERVICE}"`);
      await serviceMapPage.waitForEdgeToLoad(ERRORS_EDGE);
      await serviceMapPage.openEdgeFlyout(ERRORS_EDGE);

      await test.step('errors flyout', async () => {
        const topErrorLink = page.testSubj.locator('requestFlyoutTopErrorLink').first();
        await expect(topErrorLink).toBeVisible({ timeout: EXTENDED_TIMEOUT });
        await topErrorLink.click();
        const errorsFlyout = page.testSubj.locator('requestFlyoutErrorsFlyout');
        await expect(page.testSubj.locator('requestFlyoutApmErrorGroupLink').first()).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
        await settleFlyout(page, errorsFlyout);
        await capture(page, 'apm-05-errors-flyout');
      });

      await test.step('APM error group flyout', async () => {
        await page.testSubj.locator('requestFlyoutApmErrorGroupLink').first().click();
        const errorGroupFlyout = page.testSubj.locator('requestFlyoutApmErrorGroupFlyout');
        await settleFlyout(page, errorGroupFlyout);
        await capture(page, 'apm-04-error-group-flyout');
      });
    });

    test('span and transaction flyouts', async ({
      page,
      pageObjects: { transactionDetailsPage },
    }) => {
      await transactionDetailsPage.goToTransactionDetails({
        serviceName: SERVICE_OPBEANS_JAVA,
        transactionName: PRODUCT_TRANSACTION_NAME,
        start: testData.START_DATE,
        end: testData.END_DATE,
      });

      const waterfallName = (name: string) =>
        page.testSubj.locator('apmBarDetailsName').filter({ hasText: name }).first();

      await test.step('span flyout', async () => {
        await waterfallName('SELECT * FROM product').click({ timeout: EXTENDED_TIMEOUT });
        const spanFlyout = page.testSubj.locator('spanFlyout');
        await settleFlyout(page, spanFlyout);
        await capture(page, 'apm-06-span-flyout');
        await page.keyboard.press('Escape');
        await expect(spanFlyout).toBeHidden();
      });

      await test.step('transaction flyout', async () => {
        await waterfallName(PRODUCT_TRANSACTION_NAME).click({ timeout: EXTENDED_TIMEOUT });
        const transactionFlyout = page.testSubj.locator('transactionFlyout');
        await settleFlyout(page, transactionFlyout);
        await capture(page, 'apm-07-transaction-flyout');
      });
    });
  }
);
