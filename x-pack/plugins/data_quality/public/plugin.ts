/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import { ManagementAppLocatorParams } from '@kbn/management-plugin/common/locator';
import {
  DataQualityPluginSetup,
  DataQualityPluginStart,
  AppPluginStartDependencies,
  AppPluginSetupDependencies,
} from './types';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { DatasetQualityLocatorDefinition } from '../common/locators';

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
    const { management, share } = plugins;
    const useHash = core.uiSettings.get('state:storeInSessionStorage');

    management.sections.section.data.registerApp({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      order: 2,
      keywords: ['data', 'quality', 'data quality', 'datasets', 'datasets quality'],
      async mount(params: ManagementAppMountParams) {
        const [{ renderApp }, [coreStart, pluginsStartDeps, pluginStart]] = await Promise.all([
          import('./application'),
          core.getStartServices(),
        ]);

        return renderApp(coreStart, pluginsStartDeps, pluginStart, params);
      },
      hideFromSidebar: true,
    });

    const managementLocator =
      share.url.locators.get<ManagementAppLocatorParams>(MANAGEMENT_APP_LOCATOR);

    if (managementLocator) {
      share.url.locators.create(
        new DatasetQualityLocatorDefinition({
          useHash,
          managementLocator,
        })
      );
    }

    return {};
  }

  public start(_core: CoreStart): DataQualityPluginStart {
    return {};
  }

  public stop() {}
}
