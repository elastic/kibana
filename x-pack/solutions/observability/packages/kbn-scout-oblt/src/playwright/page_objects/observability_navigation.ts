/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ScoutPage } from '@kbn/scout';

export class ObservabilityNavigation {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('observability');
  }

  async gotoLanding() {
    await this.page.gotoApp('observability/landing');
  }
}
