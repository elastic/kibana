/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { waitForApmSettingsHeaderLink } from '../page_helpers';
import { SERVICE_OPBEANS_JAVA } from '../constants';

export class ServiceMapPage {
  public serviceMap: Locator;
  public zoomInBtn: Locator;
  public zoomOutBtn: Locator;
  public centerServiceMapBtn: Locator;
  public noServicesPlaceholder: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.serviceMap = page.testSubj.locator('serviceMap');
    this.zoomInBtn = page.locator('button[aria-label="Zoom in"]');
    this.zoomOutBtn = page.locator('button[aria-label="Zoom out"]');
    this.centerServiceMapBtn = page.testSubj.locator('centerServiceMap');
    this.noServicesPlaceholder = page.locator('.euiEmptyPrompt__content .euiTitle');
  }

  async gotoWithDateSelected(start: string, end: string) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/service-map?&rangeFrom=${start}&rangeTo=${end}`
    );
    return await waitForApmSettingsHeaderLink(this.page);
  }

  async gotoDetailedServiceMapWithDateSelected(start: string, end: string) {
    await this.page.goto(
      `${this.kbnUrl.app(
        'apm'
      )}/services/${SERVICE_OPBEANS_JAVA}/service-map?&rangeFrom=${start}&rangeTo=${end}`
    );
    return await waitForApmSettingsHeaderLink(this.page);
  }

  async getSearchBar() {
    await this.page.testSubj.waitForSelector('apmUnifiedSearchBar');
  }

  async typeInTheSearchBar(text: string) {
    await this.getSearchBar();
    await this.page.testSubj.typeWithDelay('apmUnifiedSearchBar', text, { delay: 150 });
    // extra delay needed for MKI/ECH environments to process the input
    await this.page.getByTestId('querySubmitButton').press('Enter');
  }

  async waitForServiceMapToLoad() {
    await this.serviceMap.waitFor({ state: 'visible' });
    return expect(this.serviceMap.getByLabel('Loading')).toBeHidden();
  }

  /**
   * Clicks zoom buttons by waiting for them to be enabled and handling tooltip interference
   * @param direction - 'in' for zoom in, 'out' for zoom out
   */
  async clickZoom(direction: 'in' | 'out') {
    const button = direction === 'in' ? this.zoomInBtn : this.zoomOutBtn;

    // Wait for the button to be visible
    await button.waitFor({ state: 'visible' });
    // Wait a bit for any tooltips to settle
    await this.page.waitForTimeout(500);
    // Try to click with force if normal click fails due to tooltip interference
    try {
      await button.click({ timeout: 5000 });
    } catch {
      // If normal click fails, try with force to bypass tooltip interference
      await button.click({ force: true, timeout: 5000 });
    }
  }

  async clickZoomIn() {
    await this.clickZoom('in');
  }

  async clickZoomOut() {
    await this.clickZoom('out');
  }
}
