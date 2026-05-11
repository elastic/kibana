/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { RUBY_JRUBY_METRICS } from '@kbn/synthtrace';
import { test, testData } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

const JRUBY_INSTANCE_NAME = `${testData.APM_METRICS_SERVICE_NAMES.RUBY_JRUBY}-instance`;
const EXPECTED_JRUBY_THREAD_COUNT = String(RUBY_JRUBY_METRICS['jvm.thread.count']);
// Column order in `jvm_metrics_overview/index.tsx`: Name, Host name, CPU avg,
// Heap memory avg, Non-heap memory avg, Thread count max. The thread-count
// cell is therefore the 6th `td` in each row.
const THREAD_COUNT_COLUMN_NTH_OF_TYPE = 6;

test.describe(
  'Metrics Tab - Non-Dashboard Variations',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('renders JVM metrics overview for JRuby agent', async ({
      pageObjects: { serviceDetailsPage },
    }) => {
      const { metricsTab } = serviceDetailsPage;

      await metricsTab.goToTab({
        serviceName: testData.APM_METRICS_SERVICE_NAMES.RUBY_JRUBY,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });

      await test.step('JVM table is visible', async () => {
        await expect(metricsTab.jvmMetricsTable).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      });

      await test.step('JVM table has the seeded JRuby instance row', async () => {
        const rows = metricsTab.jvmMetricsTable.locator('tbody tr');
        await expect(rows).toHaveCount(1);

        const row = rows.filter({ hasText: JRUBY_INSTANCE_NAME });
        await expect(row).toHaveCount(1);

        // Thread count column ("Thread count max") backed by jvm.thread.count;
        // we target the column directly so we are not vulnerable to other
        // cells happening to render the same integer.
        const threadCountCell = row.locator(`td:nth-of-type(${THREAD_COUNT_COLUMN_NTH_OF_TYPE})`);
        await expect(threadCountCell).toHaveText(EXPECTED_JRUBY_THREAD_COUNT);
      });

      await test.step('Dashboard panels are not shown', async () => {
        await expect(metricsTab.noDashboardCallout).toBeHidden();
        await expect(metricsTab.getDashboardPanels()).toHaveCount(0);
      });
    });

    test('renders generic service metrics for Go agent (elastic agent without dashboard)', async ({
      pageObjects: { serviceDetailsPage },
    }) => {
      const { metricsTab } = serviceDetailsPage;

      await metricsTab.goToTab({
        serviceName: testData.SERVICE_GO,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });

      await test.step('Metrics charts are visible', async () => {
        await expect(metricsTab.cpuUsageChart).toBeVisible({ timeout: EXTENDED_TIMEOUT });
      });

      await test.step('No dashboard callout is not shown (Go is an elastic agent)', async () => {
        await expect(metricsTab.noDashboardCallout).toBeHidden();
      });

      await test.step('Dashboard panels are not shown', async () => {
        await expect(metricsTab.getDashboardPanels()).toHaveCount(0);
      });

      await test.step('CPU chart has no embedded errors', async () => {
        await expect(metricsTab.cpuUsageChart.getByTestId('embeddableError')).toHaveCount(0);
      });

      await test.step('CPU chart actually rendered at least one series', async () => {
        // `.echLegendItem` is the Elastic Charts legend entry. At least one
        // entry means a series was drawn from the seeded `system.*.cpu.*`
        // fields; without this check, an empty/degenerate chart still passes.
        const legendItems = metricsTab.cpuUsageChart.locator('.echLegendItem');
        await expect(legendItems).not.toHaveCount(0, { timeout: EXTENDED_TIMEOUT });
      });
    });

    test('renders serverless metrics for AWS Lambda', async ({
      pageObjects: { serviceDetailsPage },
      page,
    }) => {
      const { metricsTab } = serviceDetailsPage;

      await metricsTab.goToTab({
        serviceName: testData.SERVICE_AWS_LAMBDA,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });

      await test.step('Serverless summary is visible', async () => {
        await expect(metricsTab.serverlessSummaryFeedbackLink).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });

      await test.step('Serverless summary exposes the expected KPI labels', async () => {
        // The aws_lambda synth fixture only emits transactions, not the lambda
        // metric fields needed to populate KPI values; we therefore assert the
        // labels are present rather than the underlying numbers.
        for (const label of [
          'Function duration avg.',
          'Billed duration avg.',
          'Memory usage avg.',
        ]) {
          await expect(page.getByText(label, { exact: true })).toBeVisible();
        }
      });

      await test.step('Dashboard panels are not shown', async () => {
        await expect(metricsTab.noDashboardCallout).toBeHidden();
        await expect(metricsTab.getDashboardPanels()).toHaveCount(0);
      });
    });
  }
);
