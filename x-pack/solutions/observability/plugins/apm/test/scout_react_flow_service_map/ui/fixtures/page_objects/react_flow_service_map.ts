/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { waitForApmSettingsHeaderLink } from '../../../../scout/ui/fixtures/page_helpers';

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
    this.reactFlowZoomInBtn = page.locator('.react-flow__controls button[aria-label="Zoom In"]');
    this.reactFlowZoomOutBtn = page.locator('.react-flow__controls button[aria-label="Zoom Out"]');
    this.reactFlowFitViewBtn = page.locator('.react-flow__controls button[aria-label="Fit View"]');
    this.noServicesPlaceholder = page.locator('.euiEmptyPrompt__content .euiTitle');
  }

  async gotoWithDateSelected(start: string, end: string) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/service-map?&rangeFrom=${start}&rangeTo=${end}`
    );
    return await waitForApmSettingsHeaderLink(this.page);
  }

  async waitForReactFlowServiceMapToLoad() {
    await this.reactFlowServiceMap.waitFor({ state: 'visible' });
  }

  async clickReactFlowZoomIn() {
    await this.reactFlowZoomInBtn.waitFor({ state: 'visible' });
    await this.reactFlowZoomInBtn.click();
  }

  async clickReactFlowZoomOut() {
    await this.reactFlowZoomOutBtn.waitFor({ state: 'visible' });
    await this.reactFlowZoomOutBtn.click();
  }

  async clickReactFlowFitView() {
    await this.reactFlowFitViewBtn.waitFor({ state: 'visible' });
    await this.reactFlowFitViewBtn.click();
  }
}
