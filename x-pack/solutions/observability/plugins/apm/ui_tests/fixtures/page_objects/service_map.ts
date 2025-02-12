/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout';

export class ServiceMapPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async gotoWithDateSelected(start: string, end: string) {
    this.page.goto(`${this.kbnUrl.app('apm')}/service-map?&rangeFrom=${start}&rangeTo=${end}`);
  }
  async getSearchBar() {
    await this.page.testSubj.waitForSelector('apmUnifiedSearchBar');
  }
  async typeInTheSearchBar() {
    await this.getSearchBar();
    await this.page.testSubj.typeWithDelay('apmUnifiedSearchBar', `_id : foo{enter}`);
  }
}
