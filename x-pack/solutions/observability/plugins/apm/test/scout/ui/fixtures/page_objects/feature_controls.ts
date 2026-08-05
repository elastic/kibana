/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '../constants';

export class FeatureControlsPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async gotoApm(spaceId?: string) {
    await this.page.goto(this.kbnUrl.app('apm', spaceId ? { space: spaceId } : undefined));
  }

  async gotoHome(spaceId?: string) {
    await this.page.goto(this.kbnUrl.app('home', spaceId ? { space: spaceId } : undefined));
    await this.page.getByTestId('logo').waitFor({ timeout: EXTENDED_TIMEOUT });
  }

  getNavLink(name: string) {
    return this.page.getByRole('link', { name });
  }

  public get apmMainContainer() {
    return this.page.getByTestId('apmMainContainer');
  }

  async waitForApmToLoad() {
    await this.apmMainContainer.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  }

  public get readOnlyBadge() {
    return this.page.getByTestId('headerBadge');
  }
}
