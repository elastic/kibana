/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

const { APM_METRICS_SERVICE_NAMES } = testData;

const dashboardScenarios = [
  { title: 'classic_apm-apm-java', serviceName: APM_METRICS_SERVICE_NAMES.JAVA_APM },
  { title: 'classic_apm-apm-nodejs', serviceName: APM_METRICS_SERVICE_NAMES.NODEJS_APM },
  { title: 'classic_apm-edot-java', serviceName: APM_METRICS_SERVICE_NAMES.EDOT_JAVA },
  { title: 'classic_apm-edot-nodejs', serviceName: APM_METRICS_SERVICE_NAMES.EDOT_NODEJS },
  { title: 'classic_apm-edot-dotnet (v9)', serviceName: APM_METRICS_SERVICE_NAMES.EDOT_DOTNET_V9 },
  {
    title: 'classic_apm-edot-dotnet-lte-v8',
    serviceName: APM_METRICS_SERVICE_NAMES.EDOT_DOTNET_V8,
  },
  { title: 'classic_apm-otel_other-java', serviceName: APM_METRICS_SERVICE_NAMES.OTEL_JAVA },
  { title: 'classic_apm-otel_other-nodejs', serviceName: APM_METRICS_SERVICE_NAMES.OTEL_NODEJS },
  { title: 'classic_apm-otel_other-dotnet', serviceName: APM_METRICS_SERVICE_NAMES.OTEL_DOTNET },
  { title: 'classic_apm-otel_other-go', serviceName: APM_METRICS_SERVICE_NAMES.OTEL_GO },
  { title: 'otel_native-edot-java', serviceName: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_EDOT_JAVA },
  {
    title: 'otel_native-edot-nodejs',
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_EDOT_NODEJS,
  },
  {
    title: 'otel_native-edot-python',
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_EDOT_PYTHON,
  },
  {
    title: 'otel_native-otel_other-java',
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_OTEL_JAVA,
  },
  {
    title: 'otel_native-otel_other-nodejs',
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_OTEL_NODEJS,
  },
  {
    title: 'otel_native-otel_other-python',
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_OTEL_PYTHON,
  },
  {
    title: 'otel_native-otel_other-go',
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_OTEL_GO,
  },
];

test.describe(
  'Metrics Tab - Dashboard Catalog',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    for (const scenario of dashboardScenarios) {
      test(`renders dashboard for ${scenario.title}`, async ({
        pageObjects: { serviceDetailsPage },
      }) => {
        await serviceDetailsPage.metricsTab.goToTab({
          serviceName: scenario.serviceName,
          rangeFrom: testData.START_DATE,
          rangeTo: testData.END_DATE,
        });

        await test.step('All dashboard panels finish rendering', async () => {
          await serviceDetailsPage.metricsTab.waitForAllPanelsToRender();
        });

        await test.step('No panels have errors', async () => {
          await expect(serviceDetailsPage.metricsTab.getPanelsWithErrors()).toHaveCount(0);
        });

        await test.step('All panels have data', async () => {
          await expect(serviceDetailsPage.metricsTab.getPanelsWithNoResults()).toHaveCount(0);
        });

        await test.step('No-dashboard callout is not shown', async () => {
          await expect(serviceDetailsPage.metricsTab.noDashboardCallout).toBeHidden();
        });
      });
    }
  }
);
