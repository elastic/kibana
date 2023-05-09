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
  PluginInitializerContext,
  AppNavLinkStatus,
} from '@kbn/core/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '@kbn/data-plugin/public';
import type { ObservabilityOnboardingConfig } from '../server';

export type ObservabilityOnboardingPluginSetup = void;
export type ObservabilityOnboardingPluginStart = void;

export interface ObservabilityOnboardingPluginSetupDeps {
  data: DataPublicPluginSetup;
  observability: ObservabilityPublicSetup;
}

export interface ObservabilityOnboardingPluginStartDeps {
  http: HttpStart;
  data: DataPublicPluginStart;
  observability: ObservabilityPublicStart;
}

export class ObservabilityOnboardingPlugin
  implements
    Plugin<
      ObservabilityOnboardingPluginSetup,
      ObservabilityOnboardingPluginStart
    >
{
  constructor(private ctx: PluginInitializerContext) {}

  public setup(
    core: CoreSetup,
    plugins: ObservabilityOnboardingPluginSetupDeps
  ) {
    const {
      ui: { enabled: isObservabilityOnboardingUiEnabled },
    } = this.ctx.config.get<ObservabilityOnboardingConfig>();

    const pluginSetupDeps = plugins;

    // set xpack.observability_onboarding.ui.enabled: true
    // and go to /app/observabilityOnboarding
    if (isObservabilityOnboardingUiEnabled) {
      core.application.register({
        navLinkStatus: AppNavLinkStatus.hidden,
        id: 'observabilityOnboarding',
        title: 'Observability Onboarding',
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

          const { createCallApi } = await import(
            './services/rest/create_call_api'
          );

          createCallApi(core);

          return renderApp({
            core: coreStart,
            deps: pluginSetupDeps,
            appMountParameters,
            corePlugins: corePlugins as ObservabilityOnboardingPluginStartDeps,
          });
        },
      });
    }
  }
  public start(
    core: CoreStart,
    plugins: ObservabilityOnboardingPluginStartDeps
  ) {}
}
