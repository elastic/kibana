/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-oblt';

export class AlertDetailsPage {
  public readonly tracesInDiscoverAction: Locator;
  public readonly viewInApmAction: Locator;
  public readonly anomalyCallout: Locator;
  public readonly anomalySeverityBadge: Locator;
  public readonly anomalyChartPanel: Locator;

  constructor(private readonly page: ScoutPage) {
    this.tracesInDiscoverAction = this.page.testSubj.locator(
      'apmAlertDetailsTracesOpenInDiscoverAction'
    );
    this.viewInApmAction = this.page.testSubj.locator('apmAlertDetailsOpenInApmAction');
    this.anomalyCallout = this.page.testSubj.locator('apmAlertDetailsAnomalyCallout');
    this.anomalySeverityBadge = this.page.testSubj.locator('apmAlertDetailsAnomalySeverityBadge');
    this.anomalyChartPanel = this.page.testSubj.locator('apmAlertDetailsAnomalyChartPanel');
  }

  async goto(alertId: string) {
    await this.page.gotoApp(`observability/alerts/${alertId}`);
  }

  getChartPanel(chartTitle: string): Locator {
    return this.page
      .locator('.euiPanel')
      .filter({ has: this.page.getByRole('heading', { name: chartTitle, exact: true }) });
  }

  getOpenActionsButton(chartTitle: string): Locator {
    return this.getChartPanel(chartTitle).locator(
      '[data-test-subj="apmAlertDetailsOpenActionsDropdown"]'
    );
  }

  getAnomalySeverityBadgeInPanel(chartTitle: string): Locator {
    return this.getChartPanel(chartTitle).locator(
      '[data-test-subj="apmAlertDetailsAnomalySeverityBadge"]'
    );
  }

  async openChartActions(chartTitle: string) {
    await this.getOpenActionsButton(chartTitle).click();
  }

  async getViewInApmHref(): Promise<string | null> {
    return this.viewInApmAction.getAttribute('href');
  }

  async getTracesInDiscoverHref(): Promise<string | null> {
    return this.tracesInDiscoverAction.getAttribute('href');
  }

  async clickViewInApm() {
    await this.viewInApmAction.click();
  }

  async clickTracesInDiscover() {
    await this.tracesInDiscoverAction.click();
  }
}
