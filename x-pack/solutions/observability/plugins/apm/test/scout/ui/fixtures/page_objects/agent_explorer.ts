/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaUrl, ScoutPage } from '@kbn/scout-oblt';

export class AgentExplorerPage {
  constructor(private readonly page: ScoutPage, private readonly kbnUrl: KibanaUrl) {}

  async goto() {
    await this.page.goto(
      `${this.kbnUrl.app(
        'apm'
      )}/settings/agent-explorer?kuery=&agentLanguage=&serviceName=&comparisonEnabled=true&environment=ENVIRONMENT_ALL`
    );
    await this.page.waitForLoadingIndicatorHidden();
    this.page.getByRole('heading', { name: 'Settings', level: 1 });

    return this.page;
  }
}
