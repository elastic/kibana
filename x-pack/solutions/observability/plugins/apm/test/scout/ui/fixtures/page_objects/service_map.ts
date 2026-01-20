/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt';
import { waitForApmSettingsHeaderLink } from '../page_helpers';
import { EXTENDED_TIMEOUT, SERVICE_OPBEANS_JAVA } from '../constants';

export class ServiceMapPage {
  // Cytoscape service map locators
  public serviceMap: Locator;
  public zoomInBtn: Locator;
  public zoomOutBtn: Locator;
  public centerServiceMapBtn: Locator;
  public noServicesPlaceholder: Locator;

  // React Flow service map locators
  public reactFlowContainer: Locator;
  public reactFlowNodes: Locator;
  public reactFlowEdges: Locator;
  public layoutToggle: Locator;
  public reactFlowZoomIn: Locator;
  public reactFlowZoomOut: Locator;
  public reactFlowFitView: Locator;
  public serviceMapPopover: Locator;
  public serviceMapPopoverContent: Locator;

  // Popover button locators
  public serviceDetailsButton: Locator;
  public focusMapButton: Locator;
  public dependencyDetailsButton: Locator;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    // Cytoscape locators
    this.serviceMap = page.testSubj.locator('serviceMap');
    this.zoomInBtn = page.locator('button[aria-label="Zoom in"]');
    this.zoomOutBtn = page.locator('button[aria-label="Zoom out"]');
    this.centerServiceMapBtn = page.testSubj.locator('centerServiceMap');
    this.noServicesPlaceholder = page.locator('.euiEmptyPrompt__content .euiTitle');

    // React Flow locators
    this.reactFlowContainer = page.testSubj.locator('reactFlowServiceMapInner');
    this.reactFlowNodes = page.locator('.react-flow__node');
    this.reactFlowEdges = page.locator('.react-flow__edge');
    this.layoutToggle = page.testSubj.locator('serviceMapLayoutToggle');
    this.reactFlowZoomIn = page.locator('.react-flow__controls button[aria-label="Zoom In"]');
    this.reactFlowZoomOut = page.locator('.react-flow__controls button[aria-label="Zoom Out"]');
    this.reactFlowFitView = page.locator('.react-flow__controls button[aria-label="Fit View"]');
    this.serviceMapPopover = page.testSubj.locator('serviceMapPopover');
    this.serviceMapPopoverContent = page.testSubj.locator('serviceMapPopoverContent');
    // Popover button locators
    this.serviceDetailsButton = page.testSubj.locator('apmServiceContentsServiceDetailsButton');
    this.focusMapButton = page.testSubj.locator('apmServiceContentsFocusMapButton');
    this.dependencyDetailsButton = page.testSubj.locator(
      'apmDependencyContentsDependencyDetailsButton'
    );
  }

  /**
   * Navigate to Cytoscape service map (legacy)
   */
  async gotoCytoscapeServiceMap(start: string, end: string) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/service-map?&rangeFrom=${start}&rangeTo=${end}`
    );
    return await waitForApmSettingsHeaderLink(this.page);
  }

  /**
   * Navigate to Cytoscape detailed service map for a specific service (legacy)
   */
  async gotoCytoscapeDetailedServiceMap(start: string, end: string) {
    await this.page.goto(
      `${this.kbnUrl.app(
        'apm'
      )}/services/${SERVICE_OPBEANS_JAVA}/service-map?&rangeFrom=${start}&rangeTo=${end}`
    );
    return await waitForApmSettingsHeaderLink(this.page);
  }

  /**
   * Navigate to React Flow service map (global level)
   * Note: React Flow is only available at global and service-group level,
   * not for individual service maps (those still use Cytoscape)
   */
  async gotoWithDateSelected(start: string, end: string) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/react-flow-service-map?&rangeFrom=${start}&rangeTo=${end}`
    );
    return await waitForApmSettingsHeaderLink(this.page);
  }

  async getSearchBar() {
    await this.page.testSubj.waitForSelector('apmUnifiedSearchBar');
  }

  async typeInTheSearchBar(text: string) {
    await this.getSearchBar();
    await this.page.testSubj.typeWithDelay('apmUnifiedSearchBar', text);
    return this.page.getByTestId('querySubmitButton').press('Enter');
  }

  async waitForServiceMapToLoad() {
    await this.serviceMap.waitFor({ state: 'visible' });
    return expect(this.serviceMap.getByLabel('Loading')).toBeHidden();
  }

  /**
   * Wait for React Flow service map to load
   */
  async waitForReactFlowServiceMapToLoad() {
    await this.reactFlowContainer.waitFor({ state: 'visible' });
    // Wait for nodes to be rendered
    await this.page
      .locator('.react-flow__nodes')
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
    return expect(this.page.locator('.react-flow__nodes')).toBeVisible();
  }

  /**
   * Click on a service node in the React Flow service map
   * @param serviceName - The service name/id to click
   */
  async clickServiceNode(serviceName: string) {
    const node = this.page.testSubj.locator(`serviceMapNode-service-${serviceName}`);
    await node.waitFor({ state: 'visible' });
    await node.click();
  }

  /**
   * Click on a dependency node in the React Flow service map
   * @param dependencyName - The dependency name/id to click
   */
  async clickDependencyNode(dependencyName: string) {
    const node = this.page.testSubj.locator(`serviceMapNode-dependency-${dependencyName}`);
    await node.waitFor({ state: 'visible' });
    await node.click();
  }

  /**
   * Get the count of nodes in the React Flow service map
   */
  async getNodeCount(): Promise<number> {
    return await this.reactFlowNodes.count();
  }

  /**
   * Get the count of service nodes in the React Flow service map
   */
  async getServiceNodeCount(): Promise<number> {
    return await this.page.locator('[data-test-subj^="serviceMapNode-service-"]').count();
  }

  /**
   * Get the count of dependency nodes in the React Flow service map
   */
  async getDependencyNodeCount(): Promise<number> {
    return await this.page.locator('[data-test-subj^="serviceMapNode-dependency-"]').count();
  }

  /**
   * Get the count of edges in the React Flow service map
   */
  async getEdgeCount(): Promise<number> {
    return await this.reactFlowEdges.count();
  }

  /**
   * Toggle the layout direction between horizontal and vertical
   * @param direction - 'horizontal' or 'vertical'
   */
  async toggleLayoutDirection(direction: 'horizontal' | 'vertical') {
    const buttonId = direction === 'horizontal' ? 'LR' : 'TB';
    const button = this.page.testSubj.locator(buttonId);
    await button.waitFor({ state: 'visible' });
    await button.click();
  }

  /**
   * Close the popover by pressing Escape key (preferred method)
   */
  async closePopover() {
    await this.page.keyboard.press('Escape');
  }

  /**
   * Close the popover by clicking on the pane
   */
  async closePopoverByClickingPane() {
    await this.reactFlowContainer.locator('.react-flow__pane').click();
  }

  /**
   * Get all visible service node labels
   */
  async getServiceNodeLabels(): Promise<string[]> {
    const nodes = this.page.locator('[data-test-subj^="serviceMapNode-service-"]');
    const allNodes = await nodes.all();
    const labels: string[] = [];
    for (const node of allNodes) {
      const text = await node.innerText();
      labels.push(text.trim());
    }
    return labels;
  }

  /**
   * Get all visible dependency node labels
   */
  async getDependencyNodeLabels(): Promise<string[]> {
    const nodes = this.page.locator('[data-test-subj^="serviceMapNode-dependency-"]');
    const allNodes = await nodes.all();
    const labels: string[] = [];
    for (const node of allNodes) {
      const text = await node.innerText();
      labels.push(text.trim());
    }
    return labels;
  }

  /**
   * Check if a specific service node is visible by name
   */
  async isServiceNodeVisible(serviceName: string): Promise<boolean> {
    const node = this.page.testSubj.locator(`serviceMapNode-service-${serviceName}`);
    return await node.isVisible();
  }

  /**
   * Click React Flow zoom in button
   */
  async clickReactFlowZoomIn() {
    await this.reactFlowZoomIn.waitFor({ state: 'visible' });
    await this.reactFlowZoomIn.click();
  }

  /**
   * Click React Flow zoom out button
   */
  async clickReactFlowZoomOut() {
    await this.reactFlowZoomOut.waitFor({ state: 'visible' });
    await this.reactFlowZoomOut.click();
  }

  /**
   * Click React Flow fit view button
   */
  async clickReactFlowFitView() {
    await this.reactFlowFitView.waitFor({ state: 'visible' });
    await this.reactFlowFitView.click();
  }

  /**
   * Clicks zoom buttons by waiting for them to be enabled
   * @param direction - 'in' for zoom in, 'out' for zoom out
   */
  async clickZoom(direction: 'in' | 'out') {
    const button = direction === 'in' ? this.zoomInBtn : this.zoomOutBtn;

    // Wait for the button to be visible and enabled
    await button.waitFor({ state: 'visible' });
    await expect(button).toBeEnabled();
    await button.click({ timeout: 5000 });
  }

  async clickZoomIn() {
    await this.clickZoom('in');
  }

  async clickZoomOut() {
    await this.clickZoom('out');
  }

  /**
   * Click the "Service Details" button in the service popover
   * Navigates to the service overview page
   */
  async clickServiceDetailsButton() {
    await this.serviceDetailsButton.waitFor({ state: 'visible' });
    await this.serviceDetailsButton.click();
  }

  /**
   * Click the "Focus map" button in the service popover
   * Navigates to the focused service map (currently Cytoscape)
   */
  async clickFocusMapButton() {
    await this.focusMapButton.waitFor({ state: 'visible' });
    await this.focusMapButton.click();
  }

  /**
   * Click the "Dependency Details" button in the dependency popover
   * Navigates to the dependency overview page
   */
  async clickDependencyDetailsButton() {
    await this.dependencyDetailsButton.waitFor({ state: 'visible' });
    await this.dependencyDetailsButton.click();
  }

  /**
   * Check if the "Service Details" button is visible in the popover
   */
  async isServiceDetailsButtonVisible(): Promise<boolean> {
    return await this.serviceDetailsButton.isVisible();
  }

  /**
   * Check if the "Focus map" button is visible in the popover
   */
  async isFocusMapButtonVisible(): Promise<boolean> {
    return await this.focusMapButton.isVisible();
  }

  /**
   * Check if the "Dependency Details" button is visible in the popover
   */
  async isDependencyDetailsButtonVisible(): Promise<boolean> {
    return await this.dependencyDetailsButton.isVisible();
  }
}
