/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, Page } from '@playwright/test';

export class KubernetesOverviewDashboardPage {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private readonly nodesPanelHeader = () => this.page.getByTestId('embeddablePanelHeading-Nodes');

  private readonly nodesInspectorButton = () =>
    this.page
      .getByTestId('embeddablePanelHoverActions-Nodes')
      .getByTestId('embeddablePanelAction-openInspector');

  private readonly nodesInspectorTableNoResults = () =>
    this.page.getByTestId('inspectorTable').getByText('No items found');

  private readonly nodesInspectorTableStatusTableCells = () =>
    this.page.getByTestId('inspectorTable').getByText('Status');

  public async assertNodesNoResultsNotVisible() {
    await expect(
      this.nodesInspectorTableNoResults(),
      'Nodes "No results" message should not be visible'
    ).toBeHidden();
  }

  public async openNodesInspector() {
    await this.nodesPanelHeader().hover();
    await this.nodesInspectorButton().click();
  }

  public async assetNodesInspectorStatusTableCells() {
    await expect(
      this.nodesInspectorTableStatusTableCells(),
      'Status table cell should exist'
    ).toBeVisible();
  }
}
