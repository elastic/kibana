/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

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
      await serviceDetailsPage.metricsTab.goToTab({
        serviceName: testData.APM_METRICS_SERVICE_NAMES.RUBY_JRUBY,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });

      await test.step('JVM table is visible', async () => {
        await expect(serviceDetailsPage.metricsTab.jvmMetricsTable).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });

      await test.step('Dashboard panels are not shown', async () => {
        await expect(serviceDetailsPage.metricsTab.noDashboardCallout).toBeHidden();
        await expect(serviceDetailsPage.metricsTab.getDashboardPanels()).toHaveCount(0);
      });
    });

    test('renders generic service metrics for Go agent (elastic agent without dashboard)', async ({
      pageObjects: { serviceDetailsPage },
    }) => {
      await serviceDetailsPage.metricsTab.goToTab({
        serviceName: testData.SERVICE_GO,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });

      await test.step('Metrics charts are visible', async () => {
        await expect(serviceDetailsPage.metricsTab.cpuUsageChart).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });

      await test.step('No dashboard callout is not shown (Go is an elastic agent)', async () => {
        await expect(serviceDetailsPage.metricsTab.noDashboardCallout).toBeHidden();
      });

      await test.step('Dashboard panels are not shown', async () => {
        await expect(serviceDetailsPage.metricsTab.getDashboardPanels()).toHaveCount(0);
      });
    });

    test('renders serverless metrics for AWS Lambda', async ({
      pageObjects: { serviceDetailsPage },
    }) => {
      await serviceDetailsPage.metricsTab.goToTab({
        serviceName: testData.SERVICE_AWS_LAMBDA,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });

      await test.step('Serverless summary is visible', async () => {
        await expect(serviceDetailsPage.metricsTab.serverlessSummaryFeedbackLink).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
      });

      await test.step('Dashboard panels are not shown', async () => {
        await expect(serviceDetailsPage.metricsTab.noDashboardCallout).toBeHidden();
        await expect(serviceDetailsPage.metricsTab.getDashboardPanels()).toHaveCount(0);
      });
    });
  }
);
