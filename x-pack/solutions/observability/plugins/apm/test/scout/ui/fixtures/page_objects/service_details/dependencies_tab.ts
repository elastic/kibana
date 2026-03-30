/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage, Locator } from '@kbn/scout-oblt';
import type { ServiceDetailsPageTabName } from './service_details_tab';
import { ServiceDetailsTab } from './service_details_tab';
import { waitForChartToLoad, waitForTableToLoad } from '../utils';

export class DependenciesTab extends ServiceDetailsTab {
  public readonly tabName: ServiceDetailsPageTabName = 'dependencies';
  public readonly tab: Locator;

  public readonly dependenciesTable: Locator;
  public readonly dependenciesBreakdownChart: Locator;

  constructor(page: ScoutPage, kbnUrl: KibanaUrl, defaultServiceName: string) {
    super(page, kbnUrl, defaultServiceName);
    this.tab = this.page.getByTestId(`${this.tabName}Tab`);
    this.dependenciesTable = this.page.getByTestId('dependenciesTable');
    this.dependenciesBreakdownChart = this.page.getByTestId('serviceDependenciesBreakdownChart');
  }

  protected async waitForTabLoad(): Promise<void> {
    await Promise.all([
      waitForChartToLoad(this.page, this.dependenciesBreakdownChart),
      waitForTableToLoad(this.page, this.dependenciesTable),
    ]);
  }

  public getDependencyInDependenciesTable(dependencyName: string) {
    return this.dependenciesTable.getByRole('link', { name: dependencyName });
  }

  public async clickDependencyInDependenciesTable(dependencyName: string) {
    await this.getDependencyInDependenciesTable(dependencyName).click();
  }
}
