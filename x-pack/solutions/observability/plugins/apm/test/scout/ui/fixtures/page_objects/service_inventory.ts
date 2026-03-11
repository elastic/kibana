/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '../constants';
import { testData } from '..';

export class ServiceInventoryPage {
  readonly servicesTable;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.servicesTable = this.page.locator('.euiBasicTable');
  }

  async gotoServiceInventory(overrides: { rangeFrom?: string; rangeTo?: string } = {}) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/services?${new URLSearchParams({
        rangeFrom: overrides.rangeFrom ?? testData.START_DATE,
        rangeTo: overrides.rangeTo ?? testData.END_DATE,
      })}`
    );
    await this.page.testSubj.waitForSelector('apmUnifiedSearchBar', { timeout: EXTENDED_TIMEOUT });
    await this.waitForServicesTableToLoad();
  }

  async waitForServicesTableToLoad() {
    await this.page
      .getByTestId('allServices')
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  getServiceLink(serviceName: string) {
    return this.servicesTable.getByRole('link', { name: serviceName });
  }

  async clickServiceLink(serviceName: string) {
    await this.getServiceLink(serviceName).click();
  }

  async waitForServiceOverviewToLoad() {
    await this.page.getByRole('tablist').waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }
}
