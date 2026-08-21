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

interface DashboardScenario {
  title: string;
  serviceName: string;
  /**
   * Subset of named panel titles we expect to see for this dashboard.
   * Sourced from the static JSON files in:
   *   x-pack/solutions/observability/plugins/apm/public/components/app/metrics/static_dashboard/dashboards/
   * We assert a subset (not the full panel list) because some dashboards
   * include unnamed Lens panels that render with auto-generated titles.
   *
   * An empty array means "this dashboard's panels are not titled in a
   * stable way for `embeddablePanelHeading-` lookups": the scenario is
   * exercised for the dashboard-load + no-error + has-data invariants
   * only and does not pin specific panel names.
   */
  expectedPanelTitles: string[];
  /**
   * Sample legend labels we expect inside one or more panels. Each entry pins
   * a (panelTitle -> labels) assertion so any future drift in the dashboard
   * JSON or the seeded synth fields is caught.
   */
  expectedLegends?: Array<{ panelTitle: string; labels: string[] }>;
}

const escapeRegex = (input: string): string => input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Tests whether the rendered legend label contains the expected label as a
 * whole "word" — anchored on either side by a non-word char or string
 * boundary. This avoids false positives like `'p500'` matching `'p50'`,
 * or `'unused'` matching `'used'`, while still tolerating breakdown
 * prefixes (e.g. `'instance-1 - p50'`).
 */
const containsLegendLabel = (rendered: string, label: string): boolean =>
  new RegExp(`\\b${escapeRegex(label)}\\b`).test(rendered);

const dashboardScenarios: DashboardScenario[] = [
  {
    title: 'classic_apm-apm-java',
    serviceName: APM_METRICS_SERVICE_NAMES.JAVA_APM,
    expectedPanelTitles: [
      'CPU Usage',
      'System Memory Usage',
      'Heap memory usage',
      'Non-heap memory usage',
      'Heap memory usage by pool',
      'Heap memory pools',
      'Garbage collection count per minute',
      'Garbage collection time spent per minute',
      'Memory allocation',
      'Thread count',
    ],
    expectedLegends: [
      {
        panelTitle: 'CPU Usage',
        labels: ['System average', 'System max', 'Process average', 'Process max'],
      },
      { panelTitle: 'System Memory Usage', labels: ['Average', 'Max'] },
    ],
  },
  {
    title: 'classic_apm-apm-nodejs',
    serviceName: APM_METRICS_SERVICE_NAMES.NODEJS_APM,
    expectedPanelTitles: [
      'CPU Usage',
      'System Memory Usage',
      'Heap usage',
      'External memory usage',
      'Number of active requests',
      'Number of active handles',
      'Average event loop delays',
    ],
    expectedLegends: [
      {
        panelTitle: 'CPU Usage',
        labels: ['System average', 'System max', 'Process average', 'Process max'],
      },
      { panelTitle: 'Heap usage', labels: ['used', 'allocated'] },
      { panelTitle: 'External memory usage', labels: ['overall', 'array buffers'] },
    ],
  },
  {
    title: 'classic_apm-edot-java',
    serviceName: APM_METRICS_SERVICE_NAMES.EDOT_JAVA,
    // opentelemetry_java.json panels are mostly unnamed, so we only assert the
    // total count of dashboard panels via the higher-level checks below.
    expectedPanelTitles: [],
  },
  {
    title: 'classic_apm-edot-nodejs',
    serviceName: APM_METRICS_SERVICE_NAMES.EDOT_NODEJS,
    expectedPanelTitles: [
      'Process Memory Usage',
      'Event Loop Delay',
      'Event Loop Utilization',
      'Process CPU Utilization',
    ],
    expectedLegends: [{ panelTitle: 'Event Loop Delay', labels: ['p90', 'p50'] }],
  },
  {
    title: 'classic_apm-edot-dotnet (v9)',
    serviceName: APM_METRICS_SERVICE_NAMES.EDOT_DOTNET_V9,
    expectedPanelTitles: ['Allocated physical memory', 'Average GC heap size by generation'],
  },
  {
    title: 'classic_apm-edot-dotnet-lte-v8',
    serviceName: APM_METRICS_SERVICE_NAMES.EDOT_DOTNET_V8,
    expectedPanelTitles: ['Allocated physical memory', 'Average GC heap size by generation'],
  },
  {
    title: 'classic_apm-otel_other-java',
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_JAVA,
    expectedPanelTitles: [],
  },
  {
    title: 'classic_apm-otel_other-nodejs',
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_NODEJS,
    expectedPanelTitles: [
      'Process Memory Usage',
      'Event Loop Delay',
      'Event Loop Utilization',
      'Process CPU Utilization',
    ],
    expectedLegends: [{ panelTitle: 'Event Loop Delay', labels: ['p90', 'p50'] }],
  },
  {
    title: 'classic_apm-otel_other-dotnet',
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_DOTNET,
    expectedPanelTitles: ['Allocated physical memory', 'Average GC heap size by generation'],
  },
  {
    title: 'classic_apm-otel_other-go',
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_GO,
    expectedPanelTitles: [],
  },
  {
    title: 'otel_native-edot-java',
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_EDOT_JAVA,
    // The "JVM overview" panel is an ESQL data table that requires the
    // `___records___` source to populate; under the seeded synth dataset it
    // renders empty, so we don't assert on it. The remaining 8 named panels
    // do render reliably.
    expectedPanelTitles: [
      'CPU Usage',
      'Relative Memory Usage',
      'Thread Count',
      'Absolute Memory Usage',
      'Heap Memory Region Statistics',
      'Non-Heap Memory Region Statistics',
      'GC count',
      'Loaded Classes',
    ],
  },
  {
    title: 'otel_native-edot-nodejs',
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_EDOT_NODEJS,
    expectedPanelTitles: [
      'Process Memory Usage',
      'Event Loop Delay',
      'Event Loop Utilization',
      'Process CPU Utilization',
    ],
  },
  {
    // The remaining otel_native dashboards (edot-python, otel_other-{java,nodejs,python,go})
    // ship Lens panels that don't set `panels[i].title`, so no
    // `embeddablePanelHeading-` is rendered for any of them. We exercise them
    // here for the dashboard load + no-error + has-data invariants only.
    title: 'otel_native-edot-python',
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_EDOT_PYTHON,
    expectedPanelTitles: [],
  },
  {
    title: 'otel_native-otel_other-java',
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_OTEL_JAVA,
    expectedPanelTitles: [],
  },
  {
    title: 'otel_native-otel_other-nodejs',
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_OTEL_NODEJS,
    expectedPanelTitles: [],
  },
  {
    title: 'otel_native-otel_other-python',
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_OTEL_PYTHON,
    expectedPanelTitles: [],
  },
  {
    title: 'otel_native-otel_other-go',
    serviceName: APM_METRICS_SERVICE_NAMES.OTEL_NATIVE_OTEL_GO,
    expectedPanelTitles: [],
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
        const { metricsTab } = serviceDetailsPage;

        await metricsTab.goToTab({
          serviceName: scenario.serviceName,
          rangeFrom: testData.START_DATE,
          rangeTo: testData.END_DATE,
        });

        await test.step('All dashboard panels finish rendering', async () => {
          await metricsTab.waitForAllPanelsToRender();
        });

        await test.step('No panels have errors', async () => {
          await expect(metricsTab.getPanelsWithErrors()).toHaveCount(0);
        });

        await test.step('All panels have data', async () => {
          await expect(metricsTab.getPanelsWithNoResults()).toHaveCount(0);
        });

        await test.step('No-dashboard callout is not shown', async () => {
          await expect(metricsTab.noDashboardCallout).toBeHidden();
        });

        await test.step('Expected named panels are present', async () => {
          const renderedTitles = await metricsTab.getPanelTitles();
          for (const expectedTitle of scenario.expectedPanelTitles) {
            expect(
              renderedTitles,
              `Dashboard "${scenario.title}" is missing the "${expectedTitle}" panel`
            ).toContain(expectedTitle);
          }
        });

        for (const { panelTitle, labels } of scenario.expectedLegends ?? []) {
          await test.step(`Legend on "${panelTitle}" exposes the seeded series`, async () => {
            await expect(metricsTab.getPanelByTitle(panelTitle)).toBeVisible();
            const renderedLabels = await metricsTab.getLegendLabels(panelTitle);
            for (const label of labels) {
              const matched = renderedLabels.some((rendered) =>
                containsLegendLabel(rendered, label)
              );
              expect(
                matched,
                `Panel "${panelTitle}" on "${
                  scenario.title
                }" is missing legend label "${label}". Got: ${JSON.stringify(renderedLabels)}`
              ).toBe(true);
            }
          });
        }
      });
    }
  }
);
