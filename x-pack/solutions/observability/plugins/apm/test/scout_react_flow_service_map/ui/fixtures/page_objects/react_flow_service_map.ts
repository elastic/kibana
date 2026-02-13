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
  public reactFlowControls: Locator;
  public reactFlowZoomInBtn: Locator;
  public reactFlowZoomOutBtn: Locator;
  public reactFlowFitViewBtn: Locator;
  public serviceMapPopover: Locator;
  public serviceMapPopoverTitle: Locator;
  public serviceMapServiceDetailsButton: Locator;
  public serviceMapFocusMapButton: Locator;
  public serviceMapDependencyDetailsButton: Locator;
  public serviceMapPopoverContent: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.reactFlowServiceMap = page.testSubj.locator('reactFlowServiceMap');
    this.reactFlowControls = page.locator('[data-testid="rf__controls"]');
    this.reactFlowZoomInBtn = this.reactFlowControls.getByRole('button', { name: 'Zoom In' });
    this.reactFlowZoomOutBtn = this.reactFlowControls.getByRole('button', { name: 'Zoom Out' });
    this.reactFlowFitViewBtn = this.reactFlowControls.getByRole('button', { name: 'Fit View' });
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
      `${this.kbnUrl.app('apm')}/service-map?&rangeFrom=${start}&rangeTo=${end}`
    );
    await this.page.testSubj
      .locator('apmSettingsHeaderLink')
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

  /* Nodes */
  getNodeById(nodeId: string) {
    return this.reactFlowServiceMap.locator(`[data-id="${nodeId}"]`);
  }

  async waitForNodeToLoad(nodeId: string) {
    await this.getNodeById(nodeId).waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  async isNodeVisible(nodeId: string) {
    return this.getNodeById(nodeId).isVisible();
  }

  /* Edges */
  getEdgeById(edgeId: string) {
    return this.reactFlowServiceMap.locator(`[data-id="${edgeId}"]`);
  }

  async waitForEdgeToLoad(edgeId: string) {
    await this.getEdgeById(edgeId).waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  async isEdgeVisible(edgeId: string) {
    return this.getEdgeById(edgeId).isVisible();
  }

  /* Popovers */
  async clickNode(nodeId: string) {
    const node = this.getNodeById(nodeId);
    await node.click();
  }

  async clickEdge(edgeId: string) {
    const edge = this.getEdgeById(edgeId);
    await edge.click();
  }

  async waitForPopoverToBeVisible() {
    await this.serviceMapPopover.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    await this.serviceMapPopoverContent.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  async waitForPopoverToBeHidden() {
    await this.serviceMapPopoverContent.waitFor({ state: 'hidden', timeout: EXTENDED_TIMEOUT });
  }

  async isPopoverVisible() {
    return this.serviceMapPopover.isVisible();
  }

  async getPopoverTitle() {
    return this.serviceMapPopoverTitle.textContent();
  }

  /* Accessibility helpers */
  async focusNode(nodeId: string) {
    const node = this.getNodeById(nodeId);
    await node.focus();
  }

  async focusNodeAndWaitForFocus(nodeId: string) {
    await this.waitForNodeToLoad(nodeId);
    const node = this.getNodeById(nodeId);
    const button = node.locator('[role="button"]');
    await button.focus();
    await this.page.waitForFunction((id) => {
      const nodeEl = document.querySelector(`[data-id="${id}"]`);
      const buttonEl = nodeEl?.querySelector('[role="button"]');
      return (
        buttonEl === document.activeElement ||
        nodeEl === document.activeElement ||
        nodeEl?.contains(document.activeElement)
      );
    }, nodeId);
  }

  async openPopoverWithKeyboard(nodeId: string, key: 'Enter' | ' ') {
    await this.focusNodeAndWaitForFocus(nodeId);

    const node = this.getNodeById(nodeId);
    const button = node.locator('[role="button"]');
    await button.press(key === ' ' ? 'Space' : key);
    await this.waitForPopoverToBeVisible();
  }

  async isNodeFocused(nodeId: string): Promise<boolean> {
    return this.page.evaluate((id) => {
      const nodeEl = document.querySelector(`[data-id="${id}"]`);
      return nodeEl === document.activeElement || nodeEl?.contains(document.activeElement) || false;
    }, nodeId);
  }

  async getNodeAriaLabel(nodeId: string): Promise<string | null> {
    const node = this.getNodeById(nodeId);
    const interactiveElement = node.locator('[role="button"]');
    return interactiveElement.getAttribute('aria-label');
  }
}
