/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, Plugin, CoreSetup, AppMountParameters } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { getServices } from './services';
import { PLUGIN_ID, INTEGRATION_ASSISTANT_APP_ROUTE } from '../common';
import { IntegrationAssistantPluginSetup, IntegrationAssistantPluginStart } from './types';

export class IntegrationAssistantPlugin
  implements Plugin<IntegrationAssistantPluginSetup, IntegrationAssistantPluginStart>
{
  public setup(core: CoreSetup): IntegrationAssistantPluginSetup {
    core.application.register({
      id: PLUGIN_ID,
      euiIconType: 'logoElastic',
      title: i18n.translate('xpack.fleet.integrationAssistantAppTitle', {
        defaultMessage: 'Integration Assistant',
      }),
      appRoute: INTEGRATION_ASSISTANT_APP_ROUTE,
      async mount(params: AppMountParameters) {
        const [coreStart] = await core.getStartServices();
        const startServices = getServices(coreStart);
        const { renderApp } = await import('./app');
        const unmount = renderApp(startServices, params.element);
        return () => {
          unmount();
        };
      },
    });
    return {
      runEcsGraph() {
        return 'test';
      },
      runCategorizationGraph() {
        return 'test';
      },
      runRelatedGraph() {
        return 'test';
      },
      runIntegrationBuilder() {
        return 'test';
      },
    };
  }

  public start(core: CoreStart) {
    return {};
  }

  public stop() {}
}
