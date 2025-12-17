/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt';
import { waitForTableToLoad } from './utils';
import { testData } from '..';

export class DependenciesInventoryPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async gotoPage(overrides?: { rangeFrom?: string; rangeTo?: string }) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/dependencies/inventory?${new URLSearchParams({
        rangeFrom: testData.OPBEANS_START_DATE,
        rangeTo: testData.OPBEANS_END_DATE,
        ...overrides,
      })}`
    );
    await this.waitForDependenciesToLoad();
  }

  async expectPageHeaderVisible() {
    await expect(this.page.getByRole('heading', { name: 'Dependencies' })).toBeVisible();
  }

  async expectDependenciesTableVisible() {
    await expect(this.page.getByTestId('dependenciesTable')).toBeVisible();
  }

  async expectDependencyInDependenciesTable(dependencyName: string) {
    await expect(this.page.getByRole('link', { name: dependencyName })).toBeVisible();
  }

  async clickDependencyInDependenciesTable(dependencyName: string) {
    await this.page.getByRole('link', { name: dependencyName }).click();
  }

  async waitForDependenciesToLoad() {
    await waitForTableToLoad(this.page, 'dependenciesTable');
  }
}
