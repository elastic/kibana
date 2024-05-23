/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import {
  DataQualityPluginSetup,
  DataQualityPluginStart,
  AppPluginStartDependencies,
  AppPluginSetupDependencies,
} from './types';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';

export class DataQualityPlugin
  implements
    Plugin<
      DataQualityPluginSetup,
      DataQualityPluginStart,
      AppPluginSetupDependencies,
      AppPluginStartDependencies
    >
{
  public setup(
    core: CoreSetup<AppPluginStartDependencies, DataQualityPluginStart>,
    plugins: AppPluginSetupDependencies
  ): DataQualityPluginSetup {
    const { management } = plugins;

    management.sections.section.data.registerApp({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      order: 2,
      async mount(params: ManagementAppMountParams) {
        const [{ renderApp }, [coreStart, pluginsStartDeps, pluginStart]] = await Promise.all([
          import('./application'),
          core.getStartServices(),
        ]);

        return renderApp(coreStart, pluginsStartDeps, pluginStart, params);
      },
      hideFromSidebar: true,
    });

    return {};
  }

  public start(_core: CoreStart): DataQualityPluginStart {
    return {};
  }

  public stop() {}
}
