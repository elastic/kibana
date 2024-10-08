/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import { mapValues } from 'lodash';
import { i18n } from '@kbn/i18n';
import { getObservabilityOnboardingServerRouteRepository } from './routes';
import { registerRoutes } from './routes/register_routes';
import { ObservabilityOnboardingRouteHandlerResources } from './routes/types';
import {
  ObservabilityOnboardingPluginSetup,
  ObservabilityOnboardingPluginSetupDependencies,
  ObservabilityOnboardingPluginStart,
  ObservabilityOnboardingPluginStartDependencies,
} from './types';
import { ObservabilityOnboardingConfig } from '.';
import { observabilityOnboardingFlow } from './saved_objects/observability_onboarding_status';
import { EsLegacyConfigService } from './services/es_legacy_config_service';

export class ObservabilityOnboardingPlugin
  implements
    Plugin<
      ObservabilityOnboardingPluginSetup,
      ObservabilityOnboardingPluginStart,
      ObservabilityOnboardingPluginSetupDependencies,
      ObservabilityOnboardingPluginStartDependencies
    >
{
  private readonly logger: Logger;
  esLegacyConfigService = new EsLegacyConfigService();

  constructor(
    private readonly initContext: PluginInitializerContext<ObservabilityOnboardingConfig>
  ) {
    this.initContext = initContext;
    this.logger = this.initContext.logger.get();
  }

  public setup(
    core: CoreSetup<
      ObservabilityOnboardingPluginStartDependencies,
      ObservabilityOnboardingPluginStart
    >,
    plugins: ObservabilityOnboardingPluginSetupDependencies
  ) {
    this.logger.debug('observability_onboarding: Setup');
    this.esLegacyConfigService.setup(core.elasticsearch.legacy.config$);

    core.savedObjects.registerType(observabilityOnboardingFlow);

    const resourcePlugins = mapValues(plugins, (value, key) => {
      return {
        setup: value,
        start: () =>
          core.getStartServices().then((services) => {
            const [, pluginsStartContracts] = services;
            return pluginsStartContracts[
              key as keyof ObservabilityOnboardingPluginStartDependencies
            ];
          }),
      };
    }) as ObservabilityOnboardingRouteHandlerResources['plugins'];

    const config = this.initContext.config.get<ObservabilityOnboardingConfig>();
    registerRoutes({
      core,
      logger: this.logger,
      repository: getObservabilityOnboardingServerRouteRepository(),
      plugins: resourcePlugins,
      config,
      kibanaVersion: this.initContext.env.packageInfo.version,
      services: {
        esLegacyConfigService: this.esLegacyConfigService,
      },
    });

    plugins.customIntegrations.registerCustomIntegration({
      id: 'otel',
      title: i18n.translate('xpack.observability_onboarding.otelTile.title', {
        defaultMessage: 'OpenTelemetry',
      }),
      categories: ['observability'],
      uiInternalPath: '/app/observabilityOnboarding/otel-logs',
      description: i18n.translate('xpack.observability_onboarding.otelTile.description', {
        defaultMessage:
          'Collect logs and host metrics using the Elastic distribution of the OpenTelemetry Collector',
      }),
      icons: [
        {
          type: 'svg',
          src: core.http.staticAssets.getPluginAssetHref('opentelemetry.svg') ?? '',
        },
      ],
      shipper: 'tutorial',
      isBeta: true,
    });

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('observability_onboarding: Started');

    return {};
  }

  public stop() {
    this.esLegacyConfigService.stop();
  }
}
