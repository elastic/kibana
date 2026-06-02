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

const CLASSIC_JAVA_PANEL_TITLE = 'Heap memory usage';
const OTEL_JAVA_PANEL_TITLE = 'Relative Memory Usage';
const TEST_TIMEOUT = 3 * 60_000;

test.describe(
  'Metrics Tab - Instrumentation Switching',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      test.setTimeout(TEST_TIMEOUT);
      await browserAuth.loginAsViewer();
    });

    test('narrows sequential migration ranges from the mixed instrumentation callout', async ({
      pageObjects: { serviceDetailsPage },
    }) => {
      const { metricsTab } = serviceDetailsPage;

      await test.step('Open the full migration range and verify OpenTelemetry is shown', async () => {
        await metricsTab.goToTab({
          serviceName: testData.SERVICE_METRICS_MIGRATION_SEQUENTIAL,
          rangeFrom: testData.START_DATE,
          rangeTo: testData.END_DATE,
        });

        await metricsTab.waitForAllPanelsToRender();
        await expect(metricsTab.mixedAgentTypesCallout).toBeVisible({ timeout: EXTENDED_TIMEOUT });
        await expect(metricsTab.mixedAgentTypesOverlapCallout).toHaveCount(0);
        await expect(metricsTab.getPanelByTitle(OTEL_JAVA_PANEL_TITLE)).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
        await expect(metricsTab.getPanelByTitle(CLASSIC_JAVA_PANEL_TITLE)).toHaveCount(0);
      });

      await test.step('Click the classic APM range link and verify the classic dashboard', async () => {
        await metricsTab.previousTimeRangeLink.click();
        await metricsTab.waitForAllPanelsToRender();

        await expect(metricsTab.getPanelByTitle(CLASSIC_JAVA_PANEL_TITLE)).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
        await expect(metricsTab.getPanelByTitle(OTEL_JAVA_PANEL_TITLE)).toHaveCount(0);
        await expect(metricsTab.noDataForRangeCallout).toHaveCount(0);

        const { rangeFrom, rangeTo } = await metricsTab.getUrlTimeRange();
        expect(rangeFrom).toBe(testData.METRICS_MIGRATION_CLASSIC_START_DATE);
        expect(rangeTo).toBe(testData.METRICS_MIGRATION_SEQUENTIAL_CLASSIC_END_DATE);
      });

      await test.step('Open the full migration range again and click the OpenTelemetry range link', async () => {
        await metricsTab.goToTab({
          serviceName: testData.SERVICE_METRICS_MIGRATION_SEQUENTIAL,
          rangeFrom: testData.START_DATE,
          rangeTo: testData.END_DATE,
        });
        await metricsTab.waitForAllPanelsToRender();

        await metricsTab.currentTimeRangeLink.click();
        await metricsTab.waitForAllPanelsToRender();

        await expect(metricsTab.getPanelByTitle(OTEL_JAVA_PANEL_TITLE)).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
        await expect(metricsTab.getPanelByTitle(CLASSIC_JAVA_PANEL_TITLE)).toHaveCount(0);

        const { rangeFrom, rangeTo } = await metricsTab.getUrlTimeRange();
        expect(rangeFrom).toBe(testData.METRICS_MIGRATION_SEQUENTIAL_OTEL_START_DATE);
        expect(rangeTo).toBe(testData.METRICS_MIGRATION_OTEL_END_DATE);
      });
    });

    test('swaps chart sets for single-instrumentation ranges and shows no-data state', async ({
      pageObjects: { serviceDetailsPage },
    }) => {
      const { metricsTab } = serviceDetailsPage;

      await test.step('Historical classic APM-only range shows the classic dashboard', async () => {
        await metricsTab.goToTab({
          serviceName: testData.SERVICE_METRICS_MIGRATION_SEQUENTIAL,
          rangeFrom: testData.METRICS_MIGRATION_CLASSIC_START_DATE,
          rangeTo: testData.METRICS_MIGRATION_SEQUENTIAL_CLASSIC_END_DATE,
        });

        await metricsTab.waitForAllPanelsToRender();
        await expect(metricsTab.getPanelByTitle(CLASSIC_JAVA_PANEL_TITLE)).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
        await expect(metricsTab.getPanelByTitle(OTEL_JAVA_PANEL_TITLE)).toHaveCount(0);
        await expect(metricsTab.mixedAgentTypesCallout).toHaveCount(0);
        await expect(metricsTab.noDataForRangeCallout).toHaveCount(0);
      });

      await test.step('Recent OpenTelemetry-only range shows the OpenTelemetry dashboard', async () => {
        await metricsTab.goToTab({
          serviceName: testData.SERVICE_METRICS_MIGRATION_SEQUENTIAL,
          rangeFrom: testData.METRICS_MIGRATION_SEQUENTIAL_OTEL_START_DATE,
          rangeTo: testData.METRICS_MIGRATION_OTEL_END_DATE,
        });

        await metricsTab.waitForAllPanelsToRender();
        await expect(metricsTab.getPanelByTitle(OTEL_JAVA_PANEL_TITLE)).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
        await expect(metricsTab.getPanelByTitle(CLASSIC_JAVA_PANEL_TITLE)).toHaveCount(0);
        await expect(metricsTab.mixedAgentTypesCallout).toHaveCount(0);
        await expect(metricsTab.noDataForRangeCallout).toHaveCount(0);
      });

      await test.step('Range with no metrics shows the no-data warning', async () => {
        await metricsTab.goToTab({
          serviceName: testData.SERVICE_METRICS_MIGRATION_SEQUENTIAL,
          rangeFrom: testData.METRICS_MIGRATION_NO_DATA_START_DATE,
          rangeTo: testData.METRICS_MIGRATION_NO_DATA_END_DATE,
        });

        await expect(metricsTab.noDataForRangeCallout).toBeVisible({ timeout: EXTENDED_TIMEOUT });
        await expect(metricsTab.getDashboardPanels()).toHaveCount(0);
      });
    });

    test('shows overlap warning when classic APM and OpenTelemetry metrics overlap', async ({
      pageObjects: { serviceDetailsPage },
    }) => {
      const { metricsTab } = serviceDetailsPage;

      await metricsTab.goToTab({
        serviceName: testData.SERVICE_METRICS_MIGRATION_OVERLAP,
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
      });

      await metricsTab.waitForAllPanelsToRender();
      await expect(metricsTab.mixedAgentTypesOverlapCallout).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
      await expect(metricsTab.mixedAgentTypesCallout).toHaveCount(0);
      await expect(metricsTab.mixedAgentTypesOverlapCallout).toContainText(
        'This service has overlapping data from multiple instrumentation types.'
      );
      await expect(metricsTab.mixedAgentTypesOverlapCallout).toContainText('OpenTelemetry');
      await expect(metricsTab.getPanelByTitle(OTEL_JAVA_PANEL_TITLE)).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });

      await test.step('Click the classic APM overlap range link and verify the date range and dashboard', async () => {
        await metricsTab.previousTimeRangeLink.click();
        await metricsTab.waitForAllPanelsToRender();

        await expect(metricsTab.getPanelByTitle(CLASSIC_JAVA_PANEL_TITLE)).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
        await expect(metricsTab.getPanelByTitle(OTEL_JAVA_PANEL_TITLE)).toHaveCount(0);
        await expect(metricsTab.noDataForRangeCallout).toHaveCount(0);

        const { rangeFrom, rangeTo } = await metricsTab.getUrlTimeRange();
        expect(rangeFrom).toBe(testData.METRICS_MIGRATION_CLASSIC_START_DATE);
        expect(rangeTo).toBe(testData.METRICS_MIGRATION_OVERLAP_CLASSIC_END_DATE);
      });

      await test.step('Open the overlap range again and click the OpenTelemetry range link', async () => {
        await metricsTab.goToTab({
          serviceName: testData.SERVICE_METRICS_MIGRATION_OVERLAP,
          rangeFrom: testData.START_DATE,
          rangeTo: testData.END_DATE,
        });
        await metricsTab.waitForAllPanelsToRender();

        await metricsTab.currentTimeRangeLink.click();
        await metricsTab.waitForAllPanelsToRender();

        await expect(metricsTab.getPanelByTitle(OTEL_JAVA_PANEL_TITLE)).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
        await expect(metricsTab.getPanelByTitle(CLASSIC_JAVA_PANEL_TITLE)).toHaveCount(0);
        await expect(metricsTab.noDataForRangeCallout).toHaveCount(0);

        const { rangeFrom, rangeTo } = await metricsTab.getUrlTimeRange();
        expect(rangeFrom).toBe(testData.METRICS_MIGRATION_OVERLAP_OTEL_START_DATE);
        expect(rangeTo).toBe(testData.METRICS_MIGRATION_OTEL_END_DATE);
      });
    });
  }
);
