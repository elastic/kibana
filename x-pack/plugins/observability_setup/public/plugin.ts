/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ObservabilityPublicSetup,
  ObservabilityPublicStart,
} from '@kbn/observability-plugin/public';
import {
  HttpStart,
  AppMountParameters,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
} from '@kbn/core/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '@kbn/data-plugin/public';

export type ObservabilitySetupPluginSetup = void;
export type ObservabilitySetupPluginStart = void;

export interface ApmPluginSetupDeps {
  data: DataPublicPluginSetup;
  observability: ObservabilityPublicSetup;
}

export interface ApmPluginStartDeps {
  http: HttpStart;
  data: DataPublicPluginStart;
  observability: ObservabilityPublicStart;
}

export class ObservabilitySetupPlugin
  implements
    Plugin<ObservabilitySetupPluginSetup, ObservabilitySetupPluginStart>
{
  constructor() {}

  public setup(core: CoreSetup, plugins: ApmPluginSetupDeps) {
    const pluginSetupDeps = plugins;

    core.application.register({
      id: 'observabilitySetup',
      title: 'Observability Setup',
      order: 8500,
      euiIconType: 'logoObservability',
      category: DEFAULT_APP_CATEGORIES.observability,
      keywords: [],
      async mount(appMountParameters: AppMountParameters<unknown>) {
        // Load application bundle and Get start service
        const [{ renderApp }, [coreStart, corePlugins]] = await Promise.all([
          import('./application/app'),
          core.getStartServices(),
        ]);

        return renderApp({
          core: coreStart,
          deps: pluginSetupDeps,
          appMountParameters,
          corePlugins: corePlugins as ApmPluginStartDeps,
        });
      },
    });
  }
  public start(core: CoreStart, plugins: ApmPluginStartDeps) {}
}
