/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import { capitalize } from 'lodash';
import type { DependencyDetailsPageTabName } from './dependency_details_tab';
import { DependencyDetailsTab } from './dependency_details_tab';
import { waitForTableToLoad } from '../utils';

export class OperationsTab extends DependencyDetailsTab {
  public readonly tabName: DependencyDetailsPageTabName = 'operations';
  public readonly tab: Locator;

  public readonly operationsTable: Locator;

  constructor(page: ScoutPage, kbnUrl: KibanaUrl, defaultDependencyName: string) {
    super(page, kbnUrl, defaultDependencyName);
    this.tab = this.page.getByRole('tab', { name: capitalize(this.tabName) });
    this.operationsTable = this.page.getByTestId('apmDependencyDetailOperationsListTable');
  }

  protected async waitForTabLoad() {
    await waitForTableToLoad(this.page, this.operationsTable);
  }

  public getOperationInOperationsTable(operationName: string) {
    return this.operationsTable.getByRole('link', { name: operationName });
  }

  public async clickOperationInOperationsTable(operationName: string) {
    await this.getOperationInOperationsTable(operationName).click();
  }
}
