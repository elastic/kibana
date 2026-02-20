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
  public serviceMapGraph: Locator;
  public mapControls: Locator;
  public zoomInBtn: Locator;
  public zoomOutBtn: Locator;
  public centerServiceMapBtn: Locator;
  public zoomInBtnControl: Locator;
  public zoomOutBtnControl: Locator;
  public fitViewBtn: Locator;
  public noServicesPlaceholder: Locator;
  public serviceMapPopover: Locator;
  public serviceMapPopoverContent: Locator;
  public serviceMapPopoverTitle: Locator;
  public serviceMapServiceDetailsButton: Locator;
  public serviceMapFocusMapButton: Locator;
  public serviceMapDependencyDetailsButton: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.serviceMap = page.testSubj.locator('serviceMap');
    this.serviceMapGraph = page.testSubj.locator('serviceMapGraph');
    this.mapControls = page.locator('[data-testid="rf__controls"]');
    this.zoomInBtn = this.mapControls.getByRole('button', { name: 'Zoom In' });
    this.zoomOutBtn = this.mapControls.getByRole('button', { name: 'Zoom Out' });
    this.centerServiceMapBtn = this.mapControls.getByRole('button', { name: 'Fit View' });
    this.zoomInBtnControl = this.zoomInBtn;
    this.zoomOutBtnControl = this.zoomOutBtn;
    this.fitViewBtn = this.centerServiceMapBtn;
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

  async gotoWithDateSelected(start: string, end: string, options?: { kuery?: string }) {
    const params = new URLSearchParams({
      rangeFrom: start,
      rangeTo: end,
      environment: PRODUCTION_ENVIRONMENT,
    });
    if (options?.kuery) {
      params.set('kuery', options.kuery);
    }
    await this.page.goto(`${this.kbnUrl.app('apm')}/service-map?${params.toString()}`);
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
    await this.serviceMapGraph.waitFor({ state: 'visible' });
  }

  async waitForMapToLoad() {
    await this.serviceMapGraph.waitFor({ state: 'visible' });
  }

  async clickZoom(direction: 'in' | 'out') {
    const button = direction === 'in' ? this.zoomInBtn : this.zoomOutBtn;
    await button.waitFor({ state: 'visible' });
    try {
      await button.click({ timeout: EXTENDED_TIMEOUT });
    } catch {
      await button.click({ timeout: EXTENDED_TIMEOUT });
    }
  }

  async clickZoomIn() {
    await this.clickZoom('in');
  }

  async clickZoomOut() {
    await this.clickZoom('out');
  }

  async clickMapZoomIn() {
    await this.zoomInBtnControl.click();
  }

  async clickMapZoomOut() {
    await this.zoomOutBtnControl.click();
  }

  async clickFitView() {
    await this.fitViewBtn.click();
  }

  getNodeById(nodeId: string) {
    return this.serviceMapGraph.locator(`[data-id="${nodeId}"]`);
  }

  /**
   * Service nodes are rendered as role="button" with aria-label like "Service: {serviceName}. Agent: {agentName}".
   * data.label (service name) has no regex-special chars in our test data; use string for substring match.
   */
  getServiceNode(serviceName: string) {
    return this.serviceMapGraph.getByRole('button', { name: serviceName });
  }

  async waitForNodeToLoad(nodeId: string) {
    await this.getNodeById(nodeId).waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  async waitForServiceNodeToLoad(serviceName: string) {
    await this.getServiceNode(serviceName).waitFor({
      state: 'visible',
      timeout: EXTENDED_TIMEOUT,
    });
  }

  getEdgeById(edgeId: string) {
    return this.serviceMapGraph.locator(`[data-id="${edgeId}"]`);
  }

  async waitForEdgeToLoad(edgeId: string) {
    await this.getEdgeById(edgeId).waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  async clickNode(nodeId: string) {
    const node = this.getNodeById(nodeId);
    await node.scrollIntoViewIfNeeded();
    await node.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    await node.focus();
    await node.click({ force: true });
  }

  /** Click a service node by its service name (uses role + aria-label). */
  async clickServiceNode(serviceName: string) {
    const button = this.getServiceNode(serviceName);
    await button.scrollIntoViewIfNeeded();
    await button.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    await button.click({ force: true });
  }

  async clickEdge(edgeId: string) {
    const edge = this.getEdgeById(edgeId);
    await edge.scrollIntoViewIfNeeded();
    await edge.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    await edge.focus();
    await edge.click({ force: true });
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

  /** Focus a service node by service name (uses role + aria-label) and wait for focus. */
  async focusServiceNodeAndWaitForFocus(serviceName: string) {
    await this.waitForServiceNodeToLoad(serviceName);
    const button = this.getServiceNode(serviceName);
    await button.focus();
    await this.page.waitForFunction(
      (name: string) => {
        const focused = document.activeElement;
        if (!focused || !focused.getAttribute('aria-label')) return false;
        return focused.getAttribute('aria-label')!.toLowerCase().includes(name.toLowerCase());
      },
      serviceName,
      { timeout: EXTENDED_TIMEOUT }
    );
  }

  /**
   * Focus the node wrapper (element with data-id) so the document keydown handler
   * sees activeElement.closest('[data-id]') and can open the popover on Enter/Space.
   */
  async focusNodeWrapperAndWaitForFocus(nodeId: string) {
    await this.waitForNodeToLoad(nodeId);
    const wrapper = this.getNodeById(nodeId);
    await wrapper.focus();
    await this.page.waitForFunction(
      (id: string) => document.activeElement?.getAttribute('data-id') === id,
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

  /**
   * Open popover via keyboard for a service node. Focuses the node wrapper then dispatches keydown
   * on document so the document listener (use_keyboard_navigation) runs; it uses activeElement
   * (the focused wrapper) to find the node and open the popover. Dispatching on document avoids
   * React Flow's node wrapper onKeyDown handling Enter/Space before our listener.
   */
  async openPopoverWithKeyboardForService(serviceName: string, key: 'Enter' | ' ') {
    await this.waitForServiceNodeToLoad(serviceName);
    await this.focusNodeWrapperAndWaitForFocus(serviceName);
    const keyToSend = key === ' ' ? ' ' : 'Enter';
    await this.page.evaluate((k: string) => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: k, code: k === ' ' ? 'Space' : 'Enter', bubbles: true })
      );
    }, keyToSend);
    await this.waitForPopoverToBeVisible();
  }
}
