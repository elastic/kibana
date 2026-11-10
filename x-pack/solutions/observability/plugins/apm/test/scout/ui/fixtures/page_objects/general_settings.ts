/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '../constants';

export class GeneralSettingsPage {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    // APM's bundle is slow to boot on a cold Cloud deployment, hence the raised `readyTimeout`.
    await this.page.gotoApp('apm/settings/general-settings', {
      readyWhen: this.page.testSubj.locator('apmMainContainer'),
      readyTimeout: EXTENDED_TIMEOUT,
    });
  }

  async getInspectEsQueriesButton() {
    return this.page.locator('button[name="Inspect ES queries"]');
  }

  async getSaveChangesButton() {
    return this.page.getByText('Save changes');
  }

  async clickInspectEsQueriesButton() {
    const button = await this.getInspectEsQueriesButton();
    await button.click();
  }

  async clickSaveChanges() {
    const button = await this.getSaveChangesButton();
    await button.click();
  }
}
