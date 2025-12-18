/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { waitForApmSettingsHeaderLink } from '../page_helpers';

export class IndicesPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto() {
    await this.page.goto(`${this.kbnUrl.app('apm')}/settings/apm-indices`);
    return await waitForApmSettingsHeaderLink(this.page);
  }

  async getErrorIndexInput() {
    return this.page.locator('input[name="error"]');
  }

  async getApplyChangesButton() {
    return this.page.getByText('Apply changes');
  }

  async setErrorIndex(value: string) {
    const input = await this.getErrorIndexInput();
    await input.clear();
    await input.fill(value);
  }

  async clickApplyChanges() {
    const button = await this.getApplyChangesButton();
    await button.click();
  }
}
