/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
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

  constructor(page: ScoutPage, kbnUrl: KibanaUrl, defaultServiceName: string) {
    super(page, kbnUrl, defaultServiceName);
    this.tab = this.page.getByTestId(`${this.tabName}Tab`);
    this.noDashboardCallout = this.page.getByTestId('apmMetricsNoDashboardFound');
    this.jvmMetricsTable = this.page.getByTestId('apmJvmMetricsTable');
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

    await this.page.waitForFunction(
      ({ completeSelector, panelSelector }) => {
        const total = document.querySelectorAll(panelSelector).length;
        const done = document.querySelectorAll(completeSelector).length;
        return total > 0 && done === total;
      },
      {
        completeSelector: RENDER_COMPLETE_SELECTOR,
        panelSelector: '[data-test-subj="embeddablePanel"]',
      },
      { timeout: EXTENDED_TIMEOUT }
    );

    await this.page.waitForFunction(
      (selector) => document.querySelectorAll(selector).length === 0,
      '.euiLoadingChart',
      { timeout: EXTENDED_TIMEOUT }
    );

    await this.page.waitForFunction(
      (selector) => document.querySelectorAll(selector).length === 0,
      '.euiProgress',
      { timeout: EXTENDED_TIMEOUT }
    );
  }
}
