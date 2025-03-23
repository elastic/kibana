/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout';

export class ServiceMapPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async waitForPageToLoad() {
    await this.page.waitForSelector(
      '[data-test-subj="kbnAppWrapper visibleChrome"] [aria-busy="false"]',
      { state: 'visible' }
    );
  }

  async gotoWithDateSelected(start: string, end: string) {
    this.page.goto(`${this.kbnUrl.app('apm')}/service-map?&rangeFrom=${start}&rangeTo=${end}`);
    await this.waitForPageToLoad();
  }
  async gotoDetailedServiceMapWithDateSelected(start: string, end: string) {
    this.page.goto(
      `${this.kbnUrl.app(
        'apm'
      )}/services/opbeans-java/service-map?&rangeFrom=${start}&rangeTo=${end}`
    );
    await this.waitForPageToLoad();
  }
  async getSearchBar() {
    await this.page.testSubj.waitForSelector('apmUnifiedSearchBar');
  }
  async typeInTheSearchBar() {
    await this.getSearchBar();
    await this.page.testSubj.typeWithDelay('apmUnifiedSearchBar', '_id : foo');
    await this.page.getByTestId('querySubmitButton').press('Enter');
  }
}
