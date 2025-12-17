/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';

export class AlertsTab {
  public globalQueryBar: Locator;
  public alertsTableEmptyState: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.globalQueryBar = page.testSubj.locator('globalQueryBar');
    this.alertsTableEmptyState = page.testSubj.locator('alertsTableEmptyState');
  }

  async gotoServiceAlertsPage(serviceName: string, start: string, end: string) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/services/${serviceName}/alerts?rangeFrom=${start}&rangeTo=${end}`
    );
  }

  async getControlFrameTitles() {
    return this.page.testSubj.locator('control-frame-title');
  }

  async waitForControlsToLoad() {
    // Wait for control filter titles to appear
    await this.page.testSubj.waitForSelector('control-frame-title', { timeout: 30000 });
  }
}
