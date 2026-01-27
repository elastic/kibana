/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '../constants';

export class ReactFlowServiceMapPage {
  public reactFlowServiceMap: Locator;
  public reactFlowZoomInBtn: Locator;
  public reactFlowZoomOutBtn: Locator;
  public reactFlowFitViewBtn: Locator;
  public reactFlowControls: Locator;
  public noServicesPlaceholder: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.reactFlowServiceMap = page.testSubj.locator('reactFlowServiceMap');
    this.reactFlowControls = this.reactFlowServiceMap.locator('.react-flow__controls');
    this.reactFlowZoomInBtn = this.reactFlowControls.getByRole('button', { name: 'Zoom In' });
    this.reactFlowZoomOutBtn = this.reactFlowControls.getByRole('button', { name: 'Zoom Out' });
    this.reactFlowFitViewBtn = this.reactFlowControls.getByRole('button', { name: 'Fit View' });
    this.noServicesPlaceholder = page.locator('.euiEmptyPrompt__content .euiTitle');
  }

  async gotoWithDateSelected(start: string, end: string) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/service-map?&rangeFrom=${start}&rangeTo=${end}`
    );
    // Wait for the APM settings header link to ensure page has loaded
    await this.page
      .getByTestId('apmSettingsHeaderLink')
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  async waitForReactFlowServiceMapToLoad() {
    await this.reactFlowServiceMap.waitFor({ state: 'visible' });
  }

  async clickReactFlowZoomIn() {
    await this.reactFlowZoomInBtn.click();
  }

  async clickReactFlowZoomOut() {
    await this.reactFlowZoomOutBtn.click();
  }

  async clickReactFlowFitView() {
    await this.reactFlowFitViewBtn.click();
  }
}
