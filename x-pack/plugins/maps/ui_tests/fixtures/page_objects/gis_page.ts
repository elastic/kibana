/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutPage} from '@kbn/scout';

export class GisPage {
  constructor(private readonly page: ScoutPage) {}

  async fullScreenModeMenuItemExists() {
    await this.page.testSubj.locator('mapsFullScreenMode').waitFor({ state: 'visible' });
  }

  async clickFullScreenMode() {
    await this.page.testSubj.click('mapsFullScreenMode')
  }

  async clickExitFullScreenTextButton() {
    await this.page.testSubj.click('exitFullScreenModeText');
  }

  async goto() {
    await this.page.gotoApp('maps');
  }
}
