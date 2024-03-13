/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, Plugin, CoreStart, AppMountParameters } from '@kbn/core/public';
import {
  SearchPlaygroundPluginSetup,
  SearchPlaygroundPluginStart,
  AppPluginStartDependencies,
} from './types';
import { PLUGIN_NAME } from '../common';

export class SearchPlaygroundPlugin
  implements Plugin<SearchPlaygroundPluginSetup, SearchPlaygroundPluginStart>
{
  public setup(core: CoreSetup): SearchPlaygroundPluginSetup {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'searchPlayground',
      title: PLUGIN_NAME,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart as AppPluginStartDependencies, params);
      },
    });

    // Return methods that should be available to other plugins
    return {
      getGreeting() {
        return i18n.translate('searchPlayground.greetingText', {
          defaultMessage: 'Hello from {name}!',
          values: {
            name: PLUGIN_NAME,
          },
        });
      },
    };
  }

  public start(core: CoreStart): SearchPlaygroundPluginStart {
    return {};
  }

  public stop() {}
}
