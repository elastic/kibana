/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, DEFAULT_APP_CATEGORIES, Plugin } from '@kbn/core/public';
import { Services } from './types';

export class ThreatIntelligencePlugin implements Plugin<void, void> {
  public setup(core: CoreSetup) {
    core.application.register({
      id: 'threatIntelligence',
      category: DEFAULT_APP_CATEGORIES.security,
      title: 'Threat Intelligence',
      async mount(params) {
        const { renderApp } = await import('./app');
        const [coreStart, startPlugins] = await core.getStartServices();

        return renderApp({ ...coreStart, ...startPlugins } as Services, params);
      },
    });
  }
  public start(_core: CoreStart) {
    return {};
  }
  public stop() {}
}
