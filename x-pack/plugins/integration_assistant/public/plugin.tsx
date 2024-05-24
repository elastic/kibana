/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, Plugin, CoreSetup, AppMountParameters } from '@kbn/core/public';
import { getServices } from './services';

import { IntegrationAssistantPluginSetup, IntegrationAssistantPluginStart } from './types';

export class IntegrationAssistantPlugin
  implements Plugin<IntegrationAssistantPluginSetup, IntegrationAssistantPluginStart>
{
  public setup(core: CoreSetup): IntegrationAssistantPluginSetup {
    core.application.register({
      id: 'integrationAssistant',
      title: 'Integration Assistant',
      async mount(params: AppMountParameters) {
        const [coreStart] = await core.getStartServices();
        const startServices = getServices(coreStart);
        const { renderApp } = await import('./app');
        return renderApp(startServices, params.element);
      },
    });
    return {};
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() { }
}
