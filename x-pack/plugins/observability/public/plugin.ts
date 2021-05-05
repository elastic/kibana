/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { BehaviorSubject } from 'rxjs';
import {
  AppMountParameters,
  AppUpdater,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin as PluginClass,
  PluginInitializerContext,
} from '../../../../src/core/public';
import type {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../src/plugins/data/public';
import type {
  HomePublicPluginSetup,
  HomePublicPluginStart,
} from '../../../../src/plugins/home/public';
import type { LensPublicStart } from '../../lens/public';
import type { RuleRegistryPublicPluginSetupContract } from '../../rule_registry/public';
import type { ObservabilityRuleFieldMap } from '../common/rules/observability_rule_field_map';
import { observabilityRuleRegistrySettings } from '../common/rules/observability_rule_registry_settings';
import { registerDataHandler } from './data_handler';
import { FormatterRuleRegistry } from './rules/formatter_rule_registry';
import { createCallObservabilityApi } from './services/call_observability_api';
import { toggleOverviewLinkInNav } from './toggle_overview_link_in_nav';
import { ConfigSchema } from '.';

export type ObservabilityPublicSetup = ReturnType<Plugin['setup']>;
export type ObservabilityRuleRegistry = ObservabilityPublicSetup['ruleRegistry'];

export interface ObservabilityPublicPluginsSetup {
  data: DataPublicPluginSetup;
  ruleRegistry: RuleRegistryPublicPluginSetupContract;
  home?: HomePublicPluginSetup;
}

export interface ObservabilityPublicPluginsStart {
  home?: HomePublicPluginStart;
  data: DataPublicPluginStart;
  lens: LensPublicStart;
}

export type ObservabilityPublicStart = void;

export class Plugin
  implements
    PluginClass<
      ObservabilityPublicSetup,
      ObservabilityPublicStart,
      ObservabilityPublicPluginsSetup,
      ObservabilityPublicPluginsStart
    > {
  private readonly appUpdater$ = new BehaviorSubject<AppUpdater>(() => ({}));

  constructor(private readonly initializerContext: PluginInitializerContext<ConfigSchema>) {
    this.initializerContext = initializerContext;
  }

  public setup(
    coreSetup: CoreSetup<ObservabilityPublicPluginsStart>,
    pluginsSetup: ObservabilityPublicPluginsSetup
  ) {
    const category = DEFAULT_APP_CATEGORIES.observability;
    const euiIconType = 'logoObservability';
    const config = this.initializerContext.config.get();

    createCallObservabilityApi(coreSetup.http);

    const observabilityRuleRegistry = pluginsSetup.ruleRegistry.registry.create({
      ...observabilityRuleRegistrySettings,
      fieldMap: {} as ObservabilityRuleFieldMap,
      ctor: FormatterRuleRegistry,
    });

    const mount = async (params: AppMountParameters<unknown>) => {
      // Load application bundle
      const { renderApp } = await import('./application');
      // Get start services
      const [coreStart, pluginsStart] = await coreSetup.getStartServices();

      return renderApp({
        config,
        core: coreStart,
        plugins: pluginsStart,
        appMountParameters: params,
        observabilityRuleRegistry,
      });
    };

    const updater$ = this.appUpdater$;

    coreSetup.application.register({
      id: 'observability-overview',
      title: 'Overview',
      appRoute: '/app/observability',
      order: 8000,
      category,
      euiIconType,
      mount,
      updater$,
    });

    if (config.unsafe.alertingExperience.enabled) {
      coreSetup.application.register({
        id: 'observability-alerts',
        title: 'Alerts',
        appRoute: '/app/observability/alerts',
        order: 8025,
        category,
        euiIconType,
        mount,
        updater$,
      });

      coreSetup.application.register({
        id: 'observability-cases',
        title: 'Cases',
        appRoute: '/app/observability/cases',
        order: 8050,
        category,
        euiIconType,
        mount,
        updater$,
      });
    }

    if (pluginsSetup.home) {
      pluginsSetup.home.featureCatalogue.registerSolution({
        id: 'observability',
        title: i18n.translate('xpack.observability.featureCatalogueTitle', {
          defaultMessage: 'Observability',
        }),
        subtitle: i18n.translate('xpack.observability.featureCatalogueSubtitle', {
          defaultMessage: 'Centralize & monitor',
        }),
        description: i18n.translate('xpack.observability.featureCatalogueDescription', {
          defaultMessage:
            'Consolidate your logs, metrics, application traces, and system availability with purpose-built UIs.',
        }),
        appDescriptions: [
          i18n.translate('xpack.observability.featureCatalogueDescription1', {
            defaultMessage: 'Monitor infrastructure metrics.',
          }),
          i18n.translate('xpack.observability.featureCatalogueDescription2', {
            defaultMessage: 'Trace application requests.',
          }),
          i18n.translate('xpack.observability.featureCatalogueDescription3', {
            defaultMessage: 'Measure SLAs and react to issues.',
          }),
        ],
        icon: 'logoObservability',
        path: '/app/observability/',
        order: 200,
      });
    }

    return {
      dashboard: { register: registerDataHandler },
      ruleRegistry: observabilityRuleRegistry,
      isAlertingExperienceEnabled: () => config.unsafe.alertingExperience.enabled,
    };
  }
  public start({ application }: CoreStart) {
    toggleOverviewLinkInNav(this.appUpdater$, application);
  }
}
