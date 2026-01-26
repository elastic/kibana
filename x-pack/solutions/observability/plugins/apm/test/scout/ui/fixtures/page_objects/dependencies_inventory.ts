/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { waitForTableToLoad } from './utils';
import { testData } from '..';

export class DependenciesInventoryPage {
  public readonly header;
  public readonly dependenciesTable;

  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {
    this.header = this.page.getByRole('heading', { name: 'Dependencies' });
    this.dependenciesTable = this.page.getByTestId('dependenciesTable');
  }

  private async waitForDependenciesToLoad() {
    await waitForTableToLoad(this.page, 'dependenciesTable');
  }

  async goToPage(overrides?: { rangeFrom?: string; rangeTo?: string }) {
    await this.page.goto(
      `${this.kbnUrl.app('apm')}/dependencies/inventory?${new URLSearchParams({
        rangeFrom: testData.START_DATE,
        rangeTo: testData.END_DATE,
        ...overrides,
      })}`
    );
    await this.waitForDependenciesToLoad();
  }

  getDependencyInDependenciesTable(dependencyName: string) {
    return this.page.getByTestId('dependenciesTable').getByRole('link', { name: dependencyName });
  }

  async clickDependencyInDependenciesTable(dependencyName: string) {
    await this.getDependencyInDependenciesTable(dependencyName).click();
  }
}
