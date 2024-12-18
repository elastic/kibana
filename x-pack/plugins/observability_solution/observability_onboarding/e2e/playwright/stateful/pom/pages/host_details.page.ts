/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect, Page } from '@playwright/test';

export class HostDetailsPage {
  page: Page;

  public readonly hostDetailsLogsTab = () => this.page.getByTestId('infraAssetDetailsLogsTab');

  private readonly hostDetailsLogsStream = () => this.page.getByTestId('logStream');

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
      /**
       * Using toBeAttached() instead of toBeVisible() because the element
       * we're selecting here has a bit weird layout with 0 height and
       * overflowing child elements. 0 height makes toBeVisible() fail.
       */
    ).toBeAttached();
  }
}
