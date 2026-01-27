/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDataGridWrapper, type KibanaUrl, type Locator, type ScoutPage } from '@kbn/scout-oblt';
import type { ServiceDetailsPageTabName } from './service_details_tab';
import { ServiceDetailsTab } from './service_details_tab';
import { EXTENDED_TIMEOUT } from '../../constants';

export class AlertsTab extends ServiceDetailsTab {
  public readonly tabName: ServiceDetailsPageTabName = 'alerts';
  public readonly tab: Locator;

  public readonly globalQueryBar: Locator;
  public readonly alertsTableEmptyState: Locator;
  public readonly controlTitles: Locator;

  public readonly alertsTable: EuiDataGridWrapper;

  constructor(page: ScoutPage, kbnUrl: KibanaUrl, defaultServiceName: string) {
    super(page, kbnUrl, defaultServiceName);
    this.tab = this.page.getByTestId(`${this.tabName}Tab`);
    this.globalQueryBar = this.page.testSubj.locator('globalQueryBar');
    this.alertsTableEmptyState = this.page.testSubj.locator('alertsTableEmptyState');
    this.controlTitles = this.page.testSubj.locator('control-frame-title');

    this.alertsTable = new EuiDataGridWrapper(this.page, 'alertsTableIsLoaded');
  }

  protected async waitForTabLoad() {
    await this.page.testSubj.locator('showQueryBarMenu').waitFor({ timeout: EXTENDED_TIMEOUT });
  }
}
