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

export class InfrastructureTab extends ServiceDetailsTab {
  public readonly tabName: ServiceDetailsPageTabName = 'infrastructure';
  public readonly tab: Locator;
  public readonly panel: Locator;
  public readonly helpButton: Locator;
  public readonly containersTab: Locator;
  public readonly podsTab: Locator;
  public readonly hostsTab: Locator;
  public readonly emptyPrompt: Locator;

  constructor(page: ScoutPage, kbnUrl: KibanaUrl, defaultServiceName: string) {
    super(page, kbnUrl, defaultServiceName);
    this.tab = this.page.getByTestId(`${this.tabName}Tab`);
    this.panel = this.page.getByTestId('apmInfrastructureTabPanel');
    this.helpButton = this.page.getByTestId('apmHelpPopoverButtonButton');
    this.containersTab = this.page.getByTestId('apmInfraTabsContainersTab');
    this.podsTab = this.page.getByTestId('apmInfraTabsPodsTab');
    this.hostsTab = this.page.getByTestId('apmInfraTabsHostsTab');
    this.emptyPrompt = this.panel.getByTestId('apmInfraTabsEmptyPrompt');
  }

  protected async waitForTabLoad(): Promise<void> {
    await this.panel.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }
}
