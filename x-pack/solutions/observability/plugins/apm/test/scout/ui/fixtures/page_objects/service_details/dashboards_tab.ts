/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage, Locator } from '@kbn/scout-oblt';
import type { ServiceDetailsPageTabName } from './service_details_tab';
import { ServiceDetailsTab } from './service_details_tab';
import { EXTENDED_TIMEOUT } from '../../constants';

export class DashboardsTab extends ServiceDetailsTab {
  public readonly tabName: ServiceDetailsPageTabName = 'dashboards';
  public readonly tab: Locator;

  public readonly addServiceDashboardButton: Locator;

  constructor(page: ScoutPage, kbnUrl: KibanaUrl, defaultServiceName: string) {
    super(page, kbnUrl, defaultServiceName);
    this.tab = this.page.getByTestId(`${this.tabName}Tab`);
    this.addServiceDashboardButton = this.page.getByTestId('apmAddServiceDashboard');
  }

  protected async waitForTabLoad(): Promise<void> {
    await this.addServiceDashboardButton.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  public async linkDashboardByTitle(dashboardTitle: string) {
    await this.addServiceDashboardButton.click();
    await this.page.getByTestId('apmSelectServiceDashboard').getByTestId('comboBoxInput').click();
    await this.page.getByText(dashboardTitle).click();
    await this.page.getByTestId('apmSelectDashboardButton').click();
  }
}
