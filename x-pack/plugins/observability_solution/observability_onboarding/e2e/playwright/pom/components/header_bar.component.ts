/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, Page } from '@playwright/test';

export class HeaderBar {
  page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  private readonly loadingIndicator = () =>
    this.page.locator('xpath=//*[@data-test-subj="globalLoadingIndicator"]');
  public readonly helpMenuButton = () =>
    this.page.locator('xpath=//div[@data-test-subj="helpMenuButton"]');

  public async assertLoadingIndicator() {
    await expect(this.loadingIndicator(), 'Loading indicator').toBeHidden();
  }

  public async assertHelpMenuButton() {
    await expect(this.helpMenuButton(), 'Help menu button').toBeVisible();
  }
}
