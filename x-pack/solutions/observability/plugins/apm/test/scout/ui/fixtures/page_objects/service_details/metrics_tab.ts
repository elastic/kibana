/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import type { ServiceDetailsPageTabName } from './service_details_tab';
import { ServiceDetailsTab } from './service_details_tab';
import { EXTENDED_TIMEOUT } from '../../constants';

const RENDER_COMPLETE_SELECTOR = '[data-test-subj="embeddablePanel"][data-render-complete="true"]';

const PANEL_WITH_ERROR_SELECTOR = '[data-test-subj="embeddablePanel"][data-error="true"]';

const EMPTY_STATE_MESSAGES = [
  'No results found',
  'No dependencies found',
  'No errors found',
  'No transactions found',
  'No instances found',
];

export class MetricsTab extends ServiceDetailsTab {
  public readonly tabName: ServiceDetailsPageTabName = 'metrics';
  public readonly tab: Locator;

  public readonly noDashboardCallout: Locator;
  public readonly jvmMetricsTable: Locator;
  public readonly cpuUsageChart: Locator;
  public readonly serverlessSummaryFeedbackLink: Locator;

  constructor(page: ScoutPage, kbnUrl: KibanaUrl, defaultServiceName: string) {
    super(page, kbnUrl, defaultServiceName);
    this.tab = this.page.getByTestId(`${this.tabName}Tab`);
    this.noDashboardCallout = this.page.getByTestId('apmMetricsNoDashboardFound');
    this.jvmMetricsTable = this.page.getByTestId('apmJvmMetricsTable');
    this.cpuUsageChart = this.page.getByTestId('cpu_usage_chart');
    this.serverlessSummaryFeedbackLink = this.page.getByTestId(
      'apmServerlessSummaryGiveFeedbackLink'
    );
  }

  protected async waitForTabLoad(): Promise<void> {
    await this.page
      .getByTestId('apmMainTemplateServiceAgentLoader')
      .waitFor({ state: 'hidden', timeout: EXTENDED_TIMEOUT });
  }

  getDashboardPanels(): Locator {
    return this.page.getByTestId('dashboardPanel');
  }

  getEmbeddablePanels(): Locator {
    return this.page.getByTestId('embeddablePanel');
  }

  getRenderCompletePanels(): Locator {
    return this.page.locator(RENDER_COMPLETE_SELECTOR);
  }

  getPanelsWithErrors(): Locator {
    return this.page.locator(PANEL_WITH_ERROR_SELECTOR);
  }

  async countPanelsWithNoResults(): Promise<number> {
    return this.page.evaluate((emptyMessages) => {
      const panels = document.querySelectorAll('[data-test-subj="embeddablePanel"]');
      let empty = 0;
      panels.forEach((panel) => {
        const text = panel.textContent ?? '';
        if (emptyMessages.some((msg: string) => text.includes(msg))) empty++;
      });
      return empty;
    }, EMPTY_STATE_MESSAGES);
  }

  async waitForAllPanelsToRender(): Promise<void> {
    await this.page.getByTestId('querySubmitButton').waitFor({ timeout: EXTENDED_TIMEOUT });

    await expect
      .poll(
        async () => {
          const total = await this.getEmbeddablePanels().count();
          const done = await this.getRenderCompletePanels().count();
          return total > 0 && done === total;
        },
        { timeout: EXTENDED_TIMEOUT }
      )
      .toBe(true);
  }
}
