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

  constructor(private readonly page: ScoutPage) {
    this.tracesInDiscoverAction = this.page.testSubj.locator(
      'apmAlertDetailsTracesOpenInDiscoverAction'
    );
    this.viewInApmAction = this.page.testSubj.locator('apmAlertDetailsOpenInApmAction');
  }

  async goto(alertId: string) {
    await this.page.gotoApp(`observability/alerts/${alertId}`);
  }

  getChartPanel(chartTitle: string): Locator {
    return this.page.locator('.euiPanel').filter({ hasText: chartTitle });
  }

  getOpenActionsButton(chartTitle: string): Locator {
    return this.getChartPanel(chartTitle).locator(
      '[data-test-subj="apmAlertDetailsOpenActionsDropdown"]'
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
