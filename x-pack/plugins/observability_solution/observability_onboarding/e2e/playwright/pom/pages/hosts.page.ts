/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, Page } from '@playwright/test';

export class HostsPage {
  page: Page;

  public readonly hostDetailsLogsTab = () =>
    this.page.locator('xpath=//button[@data-test-subj="infraAssetDetailsLogsTab"]');
  private readonly hostDetailsLogsStream = () =>
    this.page.locator('xpath=//div[@data-test-subj="logStream"]');
  public readonly noData = () => this.page.getByTestId('kbnNoDataPage');

  constructor(page: Page) {
    this.page = page;
  }

  public async clickHostDetailsLogsTab() {
    await this.hostDetailsLogsTab().click();
  }

  public async assertHostDetailsLogsStream() {
    await expect(
      this.hostDetailsLogsStream(),
      'Host details log stream should be visible'
    ).toBeVisible();
  }
}
