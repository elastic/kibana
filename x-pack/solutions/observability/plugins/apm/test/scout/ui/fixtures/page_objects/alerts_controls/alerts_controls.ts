/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-oblt';
import { AddRuleFlyout } from './add_rule_flyout';

export class AlertsControls {
  public readonly addRuleFlyout: AddRuleFlyout;

  public readonly button: Locator;
  public readonly contextMenu: Locator;

  public readonly errorCountItem: Locator;
  public readonly manageRulesItem: Locator;

  constructor(private readonly page: ScoutPage) {
    this.addRuleFlyout = new AddRuleFlyout(this.page);

    this.button = this.page.getByTestId('apmAlertAndRulesHeaderLink');
    this.contextMenu = this.page.getByRole('dialog');

    this.errorCountItem = this.contextMenu.getByTestId('apmAlertsMenuItemErrorCount');
    this.manageRulesItem = this.contextMenu.getByTestId('apmAlertsMenuItemManageRules');
  }

  public async openContextMenu() {
    await this.button.click();
    await this.contextMenu.getByTestId('contextMenuPanelTitle').getByText('Alerts').waitFor();
  }

  public async openErrorCountFlyout() {
    await this.errorCountItem.click();
    await this.addRuleFlyout.waitForErrorCountToLoad();
  }

  public async goToManageRules() {
    await this.manageRulesItem.click();
  }
}
