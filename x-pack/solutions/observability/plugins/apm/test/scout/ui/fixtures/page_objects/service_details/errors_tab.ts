/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, Locator, ScoutPage } from '@kbn/scout-oblt';
import type { ServiceDetailsPageTabName } from './service_details_tab';
import { ServiceDetailsTab } from './service_details_tab';
import { EXTENDED_TIMEOUT } from '../../constants';

export class ErrorsTab extends ServiceDetailsTab {
  public readonly tabName: ServiceDetailsPageTabName = 'errors';
  public readonly tab: Locator;

  public readonly serviceOverviewErrorsTable: Locator;

  constructor(page: ScoutPage, kbnUrl: KibanaUrl, defaultServiceName: string) {
    super(page, kbnUrl, defaultServiceName);
    this.tab = this.page.getByTestId(`${this.tabName}Tab`);
    this.serviceOverviewErrorsTable = this.page.getByTestId('serviceOverviewErrorsTable');
  }

  protected async waitForTabLoad(): Promise<void> {
    await this.page
      .getByTestId('errorDistribution')
      .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  // #region Errors Table
  getErrorsTable() {
    return this.serviceOverviewErrorsTable;
  }

  getErrorLink(errorMessage: string) {
    return this.serviceOverviewErrorsTable.getByRole('link', { name: new RegExp(errorMessage) });
  }

  async clickErrorLink(errorMessage: string) {
    await this.getErrorLink(errorMessage).click();
  }
  // #endregion
}
