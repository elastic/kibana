/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Extends service-map a11y coverage for node stats (#300591).
 * Lives here (not in `parallel_tests/service_map/service_map_a11y.spec.ts`) because:
 * - `scout_max_one_describe` allows only one root describe per file
 * - the grouping flag override is server-wide; the sequential lane (workers: 1) avoids
 *   racing sibling parallel suites (see `enableServiceMapGrouping`)
 *
 * When grouping ships as default (or the flag no longer needs a server-wide override),
 * fold this coverage into the parallel service-map a11y suite.
 *
 * `@local-*` tags: CI MKI / cloud Scout cannot apply `feature_flags.overrides` the way
 * local `apiServices` does, so this suite is intentionally local-only for now.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { enableServiceMapGrouping, removeServiceMapGroupingOverride } from '../../shared';
import { test, testData } from '../fixtures';
import {
  EXTENDED_TIMEOUT,
  SERVICE_MAP_A11Y_BUSY,
  SERVICE_MAP_A11Y_QUIET,
  SERVICE_MAP_KUERY_A11Y_IDLE,
} from '../fixtures/constants';
import { serviceMapA11yIdle } from '../fixtures/synthtrace/service_map_a11y_idle';

/** Must match `IDLE_NODE_OPACITY` in `common/service_map/constants` (Scout can't import plugin common). */
const IDLE_NODE_OPACITY = 0.5;

test.describe(
  'Service map - accessibility with node stats',
  // Local servers only: the flag can only be overridden there (see `enableServiceMapGrouping`)
  { tag: ['@local-stateful-classic', '@local-serverless-observability_complete'] },
  () => {
    test.beforeAll(async ({ apiServices, apmSynthtraceEsClient }) => {
      await enableServiceMapGrouping(apiServices);
      await apmSynthtraceEsClient.index(
        serviceMapA11yIdle({
          from: new Date(testData.START_DATE).getTime(),
          to: new Date(testData.END_DATE).getTime(),
        })
      );
    });

    test.beforeEach(async ({ browserAuth, pageObjects: { serviceMapPage } }) => {
      await browserAuth.loginAsViewer();
      await serviceMapPage.gotoWithDateSelected(testData.START_DATE, testData.END_DATE, {
        kuery: SERVICE_MAP_KUERY_A11Y_IDLE,
      });
      await serviceMapPage.waitForMapToLoad();
      await serviceMapPage.dismissPopoverIfOpen();
      await serviceMapPage.closeOptionsPanelIfOpen();
    });

    test.afterAll(async ({ apiServices, esClient }) => {
      await removeServiceMapGroupingOverride(apiServices);
      // Targeted cleanup so suite-owned docs do not linger for later sequential suites.
      // Do not call apmSynthtraceEsClient.clean() — that would wipe shared opbeans fixtures.
      try {
        await esClient.deleteByQuery({
          index: 'traces-apm*,metrics-apm*,logs-apm*',
          query: {
            terms: {
              'service.name': [SERVICE_MAP_A11Y_BUSY, SERVICE_MAP_A11Y_QUIET],
            },
          },
          refresh: true,
          conflicts: 'proceed',
        });
      } catch {
        // Continue teardown even if cleanup fails
      }
    });

    test('axe stays clean and metrics are named for screen readers', async ({
      page,
      pageObjects: { serviceMapPage },
    }) => {
      await test.step('service map graph has no accessibility violations with stats on', async () => {
        await page.testSubj.locator('serviceMapGraph').waitFor({ state: 'visible' });
        await serviceMapPage.waitForServiceNodeToLoad(SERVICE_MAP_A11Y_BUSY);
        await expect(serviceMapPage.getServiceNodeStats(SERVICE_MAP_A11Y_BUSY)).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="serviceMapGraph"]'],
        });
        expect(violations).toHaveLength(0);
      });

      await test.step('service node aria-label includes requests and visible stats text', async () => {
        const node = serviceMapPage.getServiceNode(SERVICE_MAP_A11Y_BUSY);
        const nodeRoot = serviceMapPage.getServiceNodeRoot(SERVICE_MAP_A11Y_BUSY);
        await expect(node).toHaveAttribute('role', 'button');
        await expect(node).toHaveAttribute('aria-label', new RegExp(SERVICE_MAP_A11Y_BUSY, 'i'));
        await expect(node).toHaveAttribute('aria-label', /requests per (minute|hour)/i);
        // Ring colour is not the only signal: compact rate sits in the circle; latency under the label.
        await expect(nodeRoot).toContainText(/\/(m|h)/);
        await expect(serviceMapPage.getServiceNodeStats(SERVICE_MAP_A11Y_BUSY)).toBeVisible();
        await expect(serviceMapPage.getServiceNodeStats(SERVICE_MAP_A11Y_BUSY)).toContainText(
          /ms|µs|s\b/
        );
      });
    });

    // Fade contrast (whole-node opacity) is tracked in #304434 — do not run checkA11y
    // on the faded node here until that pass lands; axe would flag contrast today.
    test('faded low-traffic service stays focusable and named', async ({
      pageObjects: { serviceMapPage },
    }) => {
      await serviceMapPage.settleServiceMapLayout();
      await serviceMapPage.waitForServiceNodeToLoad(SERVICE_MAP_A11Y_QUIET);

      const quietRoot = serviceMapPage.getServiceNodeRoot(SERVICE_MAP_A11Y_QUIET);
      const quietNode = serviceMapPage.getServiceNode(SERVICE_MAP_A11Y_QUIET);

      await expect(quietRoot).toHaveCSS('opacity', String(IDLE_NODE_OPACITY));
      await expect(quietNode).toHaveAttribute(
        'aria-label',
        new RegExp(SERVICE_MAP_A11Y_QUIET, 'i')
      );
      await expect(quietNode).toHaveAttribute('aria-label', /Low traffic/i);
      await expect(quietNode).toHaveAttribute('tabindex', '0');

      await expect
        .poll(
          async () => {
            await quietNode.focus();
            return quietNode.evaluate((element) => element === document.activeElement);
          },
          { timeout: EXTENDED_TIMEOUT }
        )
        .toBe(true);
    });
  }
);
