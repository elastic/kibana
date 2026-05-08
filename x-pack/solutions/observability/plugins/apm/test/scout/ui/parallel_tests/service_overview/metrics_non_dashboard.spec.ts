/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { RUBY_JRUBY_METRICS } from '@kbn/synthtrace/src/scenarios/helpers/apm_metrics_dashboards';
import { test, testData } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

const JRUBY_INSTANCE_NAME = `${testData.APM_METRICS_SERVICE_NAMES.RUBY_JRUBY}-instance`;
const EXPECTED_JRUBY_THREAD_COUNT = String(RUBY_JRUBY_METRICS['jvm.thread.count']);

test.describe(
  'Metrics Tab - Non-Dashboard Variations',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('renders JVM metrics overview for JRuby agent', async ({
      pageObjects: { serviceDetailsPage },
      page,
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

        const row = rows.first();
        await expect(row).toContainText(JRUBY_INSTANCE_NAME);

        // Thread count column ("Thread count max"). Backed by jvm.thread.count
        // which we seed as a constant value, so the integer-formatted cell
        // should match exactly.
        const threadCountCell = row.locator('td', {
          has: page.locator(`text=/^${EXPECTED_JRUBY_THREAD_COUNT}$/`),
        });
        await expect(threadCountCell).toHaveCount(1);
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
          await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
        }
      });

      await test.step('Dashboard panels are not shown', async () => {
        await expect(metricsTab.noDashboardCallout).toBeHidden();
        await expect(metricsTab.getDashboardPanels()).toHaveCount(0);
      });
    });
  }
);
