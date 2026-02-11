/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { waitForApmSettingsHeaderLink } from '../page_helpers';
import { EXTENDED_TIMEOUT, PRODUCTION_ENVIRONMENT, SERVICE_OPBEANS_JAVA } from '../constants';

export class ServiceMapPage {
  public serviceMap: Locator;
  public reactFlowServiceMap: Locator;
  public reactFlowControls: Locator;
  public zoomInBtn: Locator;
  public zoomOutBtn: Locator;
  public centerServiceMapBtn: Locator;
  public reactFlowZoomInBtn: Locator;
  public reactFlowZoomOutBtn: Locator;
  public reactFlowFitViewBtn: Locator;
  public noServicesPlaceholder: Locator;
  public serviceMapPopover: Locator;
  public serviceMapPopoverContent: Locator;
  public serviceMapPopoverTitle: Locator;
  public serviceMapServiceDetailsButton: Locator;
  public serviceMapFocusMapButton: Locator;
  public serviceMapDependencyDetailsButton: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.serviceMap = page.testSubj.locator('serviceMap');
    this.reactFlowServiceMap = page.testSubj.locator('reactFlowServiceMap');
    this.reactFlowControls = page.locator('[data-testid="rf__controls"]');
    this.zoomInBtn = this.reactFlowControls.getByRole('button', { name: 'Zoom In' });
    this.zoomOutBtn = this.reactFlowControls.getByRole('button', { name: 'Zoom Out' });
    this.centerServiceMapBtn = this.reactFlowControls.getByRole('button', { name: 'Fit View' });
    this.reactFlowZoomInBtn = this.zoomInBtn;
    this.reactFlowZoomOutBtn = this.zoomOutBtn;
    this.reactFlowFitViewBtn = this.centerServiceMapBtn;
    this.noServicesPlaceholder = page.locator('.euiEmptyPrompt__content .euiTitle');
    this.serviceMapPopover = page.testSubj.locator('serviceMapPopover');
    this.serviceMapPopoverContent = page.testSubj.locator('serviceMapPopoverContent');
    this.serviceMapPopoverTitle = page.testSubj.locator('serviceMapPopoverTitle');
    this.serviceMapServiceDetailsButton = page.testSubj.locator(
      'apmServiceContentsServiceDetailsButton'
    );
    this.serviceMapFocusMapButton = page.testSubj.locator('apmServiceContentsFocusMapButton');
    this.serviceMapDependencyDetailsButton = page.testSubj.locator(
      'apmDependencyContentsDependencyDetailsButton'
    );
  }

  async gotoWithDateSelected(start: string, end: string) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/service-map?rangeFrom=${start}&rangeTo=${end}&environment=${PRODUCTION_ENVIRONMENT}`
    );
    return await waitForApmSettingsHeaderLink(this.page);
  }

  async gotoDetailedServiceMapWithDateSelected(start: string, end: string) {
    await this.page.goto(
      `${this.kbnUrl.app(
        'apm'
      )}/services/${SERVICE_OPBEANS_JAVA}/service-map?rangeFrom=${start}&rangeTo=${end}&environment=${PRODUCTION_ENVIRONMENT}`
    );
    return await waitForApmSettingsHeaderLink(this.page);
  }

  async getSearchBar() {
    await this.page.testSubj.waitForSelector('apmUnifiedSearchBar');
  }

  async typeInTheSearchBar(text: string) {
    await this.getSearchBar();
    await this.page.testSubj.typeWithDelay('apmUnifiedSearchBar', text, { delay: 150 });
    await this.page.getByTestId('querySubmitButton').press('Enter');
  }

  async waitForServiceMapToLoad() {
    await this.serviceMap.waitFor({ state: 'visible' });
    await this.reactFlowServiceMap.waitFor({ state: 'visible' });
  }

  async waitForReactFlowServiceMapToLoad() {
    await this.reactFlowServiceMap.waitFor({ state: 'visible' });
  }

  async clickZoom(direction: 'in' | 'out') {
    const button = direction === 'in' ? this.zoomInBtn : this.zoomOutBtn;
    await button.waitFor({ state: 'visible' });
    await this.page.waitForTimeout(500);
    try {
      await button.click({ timeout: 5000 });
    } catch {
      await button.click({ force: true, timeout: 5000 });
    }
  }

  async clickZoomIn() {
    await this.clickZoom('in');
  }

  async clickZoomOut() {
    await this.clickZoom('out');
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

  getNodeById(nodeId: string) {
    return this.reactFlowServiceMap.locator(`[data-id="${nodeId}"]`);
  }

  async waitForNodeToLoad(nodeId: string) {
    await this.getNodeById(nodeId).waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  getEdgeById(edgeId: string) {
    return this.reactFlowServiceMap.locator(`[data-id="${edgeId}"]`);
  }

  async waitForEdgeToLoad(edgeId: string) {
    await this.getEdgeById(edgeId).waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  async clickNode(nodeId: string, options?: { force?: boolean }) {
    await this.getNodeById(nodeId).click(options?.force ? { force: true } : undefined);
  }

  async clickEdge(edgeId: string) {
    await this.getEdgeById(edgeId).click();
  }

  async waitForPopoverToBeVisible() {
    await this.serviceMapPopover.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    await this.serviceMapPopoverContent.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  async waitForPopoverToBeHidden(options?: { timeout?: number }) {
    await this.serviceMapPopoverContent.waitFor({
      state: 'hidden',
      timeout: options?.timeout ?? EXTENDED_TIMEOUT,
    });
  }

  /** Dismiss any open popover (e.g. so a node is not covered). No-op if popover already hidden. */
  async dismissPopoverIfOpen() {
    await this.page.keyboard.press('Escape');
    await this.waitForPopoverToBeHidden({ timeout: 2000 }).catch(() => {});
  }

  async getPopoverTitle() {
    return this.serviceMapPopoverTitle.textContent();
  }

  async focusNodeAndWaitForFocus(nodeId: string) {
    await this.waitForNodeToLoad(nodeId);
    const node = this.getNodeById(nodeId);
    const button = node.locator('[role="button"]');
    await button.focus();
    await this.page.waitForFunction(
      (id) => {
        const nodeEl = document.querySelector(`[data-id="${id}"]`);
        const buttonEl = nodeEl?.querySelector('[role="button"]');
        return (
          buttonEl === document.activeElement ||
          nodeEl === document.activeElement ||
          (nodeEl?.contains(document.activeElement) ?? false)
        );
      },
      nodeId,
      { timeout: EXTENDED_TIMEOUT }
    );
  }

  async openPopoverWithKeyboard(nodeId: string, key: 'Enter' | ' ') {
    await this.focusNodeAndWaitForFocus(nodeId);
    const node = this.getNodeById(nodeId);
    const button = node.locator('[role="button"]');
    await button.press(key === ' ' ? 'Space' : key);
    await this.waitForPopoverToBeVisible();
  }
}
