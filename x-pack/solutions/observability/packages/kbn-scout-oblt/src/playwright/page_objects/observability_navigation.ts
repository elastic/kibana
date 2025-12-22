/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';

export class ObservabilityNavigation {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('observability');
  }

  async gotoLanding() {
    // Overview/landing is now in the separate observabilityOverview app
    await this.page.gotoApp('observabilityOverview/landing');
  }

  async gotoOverview() {
    await this.page.gotoApp('observabilityOverview');
  }
}
