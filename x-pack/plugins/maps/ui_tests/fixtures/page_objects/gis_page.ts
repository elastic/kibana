/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutPage } from '@kbn/scout';

const RENDER_COMPLETE_SELECTOR = '[data-render-complete="true"]';
export class GisPage {
  constructor(private readonly page: ScoutPage) {}

  async clickFullScreenMode() {
    await this.page.testSubj.click('mapsFullScreenMode');
  }

  async clickExitFullScreenTextButton() {
    await this.page.testSubj.click('exitFullScreenModeText');
  }

  async goto() {
    await this.page.pause();
    await this.page.gotoApp('maps');
    await this.waitForRenderCompletion();
  }

  async waitForRenderCompletion(selector: string = RENDER_COMPLETE_SELECTOR) {
    await this.page.locator(selector).waitFor();
  }
}
