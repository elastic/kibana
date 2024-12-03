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

  private readonly nodesPanelHeader = () =>
    this.page.locator('xpath=//figcaption[@data-test-subj="embeddablePanelHeading-Nodes"]');
  private readonly nodesInspectorButton = () =>
    this.page.locator(
      'xpath=//div[@data-test-subj="embeddablePanelHoverActions-Nodes"]//button[@data-test-subj="embeddablePanelAction-openInspector"]'
    );
  private readonly nodesInspectorTableStatusTableCells = () =>
    this.page.locator(
      'xpath=//div[@data-test-subj="inspectorTable"]//td//div[contains(text(), "Status")]'
    );

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
