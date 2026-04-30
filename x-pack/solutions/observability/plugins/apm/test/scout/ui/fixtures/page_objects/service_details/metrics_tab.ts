/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { EmbeddablePanels } from '../embeddable_panels';
import type { ServiceDetailsPageTabName } from './service_details_tab';
import { ServiceDetailsTab } from './service_details_tab';
import { EXTENDED_TIMEOUT } from '../../constants';

export class MetricsTab extends ServiceDetailsTab {
  public readonly tabName: ServiceDetailsPageTabName = 'metrics';
  public readonly tab: Locator;
  public readonly panels: EmbeddablePanels;

  public readonly noDashboardCallout: Locator;
  public readonly jvmMetricsTable: Locator;
  public readonly cpuUsageChart: Locator;
  public readonly serverlessSummaryFeedbackLink: Locator;

  constructor(page: ScoutPage, kbnUrl: KibanaUrl, defaultServiceName: string) {
    super(page, kbnUrl, defaultServiceName);
    this.tab = this.page.getByTestId(`${this.tabName}Tab`);
    this.panels = new EmbeddablePanels(page);
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
    return this.panels.getEmbeddablePanels();
  }

  getRenderCompletePanels(): Locator {
    return this.panels.getRenderCompletePanels();
  }

  getPanelsWithErrors(): Locator {
    return this.panels.getPanelsWithErrors();
  }

  getPanelsWithNoResults(): Locator {
    return this.panels.getPanelsWithNoResults();
  }

  async waitForAllPanelsToRender(): Promise<void> {
    await this.page.getByTestId('querySubmitButton').waitFor({ timeout: EXTENDED_TIMEOUT });
    await this.panels.waitForAllPanelsToRender(EXTENDED_TIMEOUT);
  }
}
