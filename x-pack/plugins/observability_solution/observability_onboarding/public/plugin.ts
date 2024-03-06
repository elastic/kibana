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
} from '@kbn/core/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '@kbn/data-plugin/public';
import { SharePluginSetup } from '@kbn/share-plugin/public';
import type { ObservabilityOnboardingConfig } from '../server';
import { PLUGIN_ID } from '../common';
import { ObservabilityOnboardingLocatorDefinition } from './locators/onboarding_locator/locator_definition';
import { ObservabilityOnboardingPluginLocators } from './locators';
import { ConfigSchema } from '.';

export type ObservabilityOnboardingPluginSetup = void;
export type ObservabilityOnboardingPluginStart = void;

export interface ObservabilityOnboardingPluginSetupDeps {
  data: DataPublicPluginSetup;
  observability: ObservabilityPublicSetup;
  share: SharePluginSetup;
}

export interface ObservabilityOnboardingPluginStartDeps {
  http: HttpStart;
  data: DataPublicPluginStart;
  observability: ObservabilityPublicStart;
}

export interface ObservabilityOnboardingPluginContextValue {
  core: CoreStart;
  plugins: ObservabilityOnboardingPluginSetupDeps;
  data: DataPublicPluginStart;
  observability: ObservabilityPublicStart;
  config: ConfigSchema;
}

export class ObservabilityOnboardingPlugin
  implements
    Plugin<
      ObservabilityOnboardingPluginSetup,
      ObservabilityOnboardingPluginStart
    >
{
  private locators?: ObservabilityOnboardingPluginLocators;

  constructor(private ctx: PluginInitializerContext) {}

  public setup(
    core: CoreSetup,
    plugins: ObservabilityOnboardingPluginSetupDeps
  ) {
    const config = this.ctx.config.get<ObservabilityOnboardingConfig>();
    const {
      ui: { enabled: isObservabilityOnboardingUiEnabled },
    } = config;

    const pluginSetupDeps = plugins;

    // set xpack.observability_onboarding.ui.enabled: true
    // and go to /app/observabilityOnboarding
    if (isObservabilityOnboardingUiEnabled) {
      core.application.register({
        id: PLUGIN_ID,
        title: 'Observability Onboarding',
        order: 8500,
        euiIconType: 'logoObservability',
        category: DEFAULT_APP_CATEGORIES.observability,
        keywords: [],
        async mount(appMountParameters: AppMountParameters) {
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
            config,
          });
        },
        visibleIn: [],
      });
    }

    this.locators = {
      onboarding: plugins.share.url.locators.create(
        new ObservabilityOnboardingLocatorDefinition()
      ),
    };

    return {
      locators: this.locators,
    };
  }
  public start(
    core: CoreStart,
    plugins: ObservabilityOnboardingPluginStartDeps
  ) {
    return {
      locators: this.locators,
    };
  }
}
