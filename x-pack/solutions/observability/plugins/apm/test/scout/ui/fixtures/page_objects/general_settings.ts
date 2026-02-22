/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { waitForApmSettingsHeaderLink } from '../page_helpers';

export class GeneralSettingsPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto() {
    await this.page.goto(`${this.kbnUrl.app('apm')}/settings/general-settings`);
    return await waitForApmSettingsHeaderLink(this.page);
  }

  getInspectEsQueriesButton() {
    // Button identified by name attribute; no data-test-subj available
    return this.page.locator('button[name="Inspect ES queries"]');
  }

  getSaveChangesButton() {
    return this.page.getByText('Save changes');
  }

  async clickInspectEsQueriesButton() {
    const button = this.getInspectEsQueriesButton();
    await button.click();
  }

  async clickSaveChanges() {
    const button = this.getSaveChangesButton();
    await button.click();
  }
}
