/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt';

export class ServiceMapPage {
  public serviceMap: Locator;
  public zoomInBtn: Locator;
  public centerServiceMapBtn: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.serviceMap = page.testSubj.locator('serviceMap');
    this.zoomInBtn = page.getByLabel('Zoom In');
    this.centerServiceMapBtn = page.testSubj.locator('centerServiceMap');
  }

  async gotoWithDateSelected(start: string, end: string) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/service-map?&rangeFrom=${start}&rangeTo=${end}`
    );
    return this.page.waitForLoadingIndicatorHidden();
  }

  async gotoDetailedServiceMapWithDateSelected(start: string, end: string) {
    await this.page.goto(
      `${this.kbnUrl.app(
        'apm'
      )}/services/opbeans-java/service-map?&rangeFrom=${start}&rangeTo=${end}`
    );
    return this.page.waitForLoadingIndicatorHidden();
  }

  async getSearchBar() {
    await this.page.testSubj.waitForSelector('apmUnifiedSearchBar');
  }

  async typeInTheSearchBar() {
    await this.getSearchBar();
    await this.page.testSubj.typeWithDelay('apmUnifiedSearchBar', '_id : foo');
    return this.page.getByTestId('querySubmitButton').press('Enter');
  }

  async waitForServiceMapToLoad() {
    await this.serviceMap.waitFor({ state: 'visible' });
    return expect(this.serviceMap.getByLabel('Loading')).toBeHidden();
  }
}
