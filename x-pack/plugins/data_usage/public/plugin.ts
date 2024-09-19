/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { PluginInitializerContext } from '@kbn/core/public';
import {
  DataUsagePublicSetup,
  DataUsagePublicStart,
  DataUsageStartDependencies,
  DataUsageSetupDependencies,
} from './types';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';

export class DataUsagePlugin
  implements
    Plugin<
      DataUsagePublicSetup,
      DataUsagePublicStart,
      DataUsageSetupDependencies,
      DataUsageStartDependencies
    >
{
  private isServerless: boolean = false;
  constructor(initializerContext: PluginInitializerContext) {
    this.isServerless = initializerContext.env.packageInfo.buildFlavor === 'serverless';
  }
  public setup(
    core: CoreSetup<DataUsageStartDependencies, DataUsagePublicStart>,
    plugins: DataUsageSetupDependencies
  ): DataUsagePublicSetup {
    const { management } = plugins;
    if (!this.isServerless) return {};
    management.sections.section.data.registerApp({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      order: 6,
      keywords: ['data usage', 'usage'],
      async mount(params: ManagementAppMountParams) {
        const [{ renderApp }, [coreStart, pluginsStartDeps, pluginStart]] = await Promise.all([
          import('./application'),
          core.getStartServices(),
        ]);

        return renderApp(coreStart, pluginsStartDeps, pluginStart, params);
      },
    });

    return {};
  }

  public start(_core: CoreStart): DataUsagePublicStart {
    return {};
  }

  public stop() {}
}
