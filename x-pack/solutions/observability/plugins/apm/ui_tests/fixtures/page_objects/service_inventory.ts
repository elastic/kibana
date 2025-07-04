/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';

export class ServiceInventoryPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async gotoDetailedServiceInventoryWithDateSelected(start: string, end: string) {
    await this.page.goto(`${this.kbnUrl.app('apm')}/services?&rangeFrom=${start}&rangeTo=${end}`);
    return this.page.waitForLoadingIndicatorHidden();
  }
}
