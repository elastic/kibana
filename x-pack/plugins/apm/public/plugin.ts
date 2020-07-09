/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { lazy } from 'react';
import { ConfigSchema } from '.';
import { ObservabilityPluginSetup } from '../../observability/public';
import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
  PluginInitializerContext,
} from '../../../../src/core/public';
import {
  DataPublicPluginSetup,
  DataPublicPluginStart,
} from '../../../../src/plugins/data/public';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import {
  PluginSetupContract as AlertingPluginPublicSetup,
  PluginStartContract as AlertingPluginPublicStart,
} from '../../alerts/public';
import { FeaturesPluginSetup } from '../../features/public';
import { LicensingPluginSetup } from '../../licensing/public';
import {
  TriggersAndActionsUIPublicPluginSetup,
  TriggersAndActionsUIPublicPluginStart,
} from '../../triggers_actions_ui/public';
import { AlertType } from '../common/alert_types';
import { featureCatalogueEntry } from './featureCatalogueEntry';
import { createCallApmApi } from './services/rest/createCallApmApi';
import { setHelpExtension } from './setHelpExtension';
import { toggleAppLinkInNav } from './toggleAppLinkInNav';
import { setReadonlyBadge } from './updateBadge';
import { createStaticIndexPattern } from './services/rest/index_pattern';
import {
  fetchLandingPageData,
  hasData,
} from './services/rest/observability_dashboard';

export type ApmPluginSetup = void;
export type ApmPluginStart = void;

export interface ApmPluginSetupDeps {
  alerts?: AlertingPluginPublicSetup;
  data: DataPublicPluginSetup;
  features: FeaturesPluginSetup;
  home: HomePublicPluginSetup;
  licensing: LicensingPluginSetup;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginSetup;
  observability?: ObservabilityPluginSetup;
}

export interface ApmPluginStartDeps {
  alerts?: AlertingPluginPublicStart;
  data: DataPublicPluginStart;
  home: void;
  licensing: void;
  triggers_actions_ui: TriggersAndActionsUIPublicPluginStart;
}

export class ApmPlugin implements Plugin<ApmPluginSetup, ApmPluginStart> {
  constructor(
    private readonly initializerContext: PluginInitializerContext<ConfigSchema>
  ) {
    this.initializerContext = initializerContext;
  }
  public setup(core: CoreSetup, plugins: ApmPluginSetupDeps) {
    createCallApmApi(core.http);
    const config = this.initializerContext.config.get();
    const pluginSetupDeps = plugins;

    pluginSetupDeps.home.environment.update({ apmUi: true });
    pluginSetupDeps.home.featureCatalogue.register(featureCatalogueEntry);

    if (plugins.observability) {
      plugins.observability.dashboard.register({
        appName: 'apm',
        fetchData: async (params) => {
          return fetchLandingPageData(params);
        },
        hasData,
      });
    }

    core.application.register({
      id: 'apm',
      title: 'APM',
      order: 8300,
      euiIconType: 'apmApp',
      appRoute: '/app/apm',
      icon: 'plugins/apm/public/icon.svg',
      category: DEFAULT_APP_CATEGORIES.observability,

      async mount(params: AppMountParameters<unknown>) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services
        const [coreStart] = await core.getStartServices();

        // render APM feedback link in global help menu
        setHelpExtension(coreStart);
        setReadonlyBadge(coreStart);

        // Automatically creates static index pattern and stores as saved object
        createStaticIndexPattern().catch((e) => {
          // eslint-disable-next-line no-console
          console.log('Error creating static index pattern', e);
        });

        return renderApp(coreStart, pluginSetupDeps, params, config);
      },
    });
  }
  public start(core: CoreStart, plugins: ApmPluginStartDeps) {
    toggleAppLinkInNav(core, this.initializerContext.config.get());

    plugins.triggers_actions_ui.alertTypeRegistry.register({
      id: AlertType.ErrorRate,
      name: i18n.translate('xpack.apm.alertTypes.errorRate', {
        defaultMessage: 'Error rate',
      }),
      iconClass: 'bell',
      alertParamsExpression: lazy(() =>
        import('./components/shared/ErrorRateAlertTrigger')
      ),
      validate: () => ({
        errors: [],
      }),
      requiresAppContext: true,
    });

    plugins.triggers_actions_ui.alertTypeRegistry.register({
      id: AlertType.TransactionDuration,
      name: i18n.translate('xpack.apm.alertTypes.transactionDuration', {
        defaultMessage: 'Transaction duration',
      }),
      iconClass: 'bell',
      alertParamsExpression: lazy(() =>
        import('./components/shared/TransactionDurationAlertTrigger')
      ),
      validate: () => ({
        errors: [],
      }),
      requiresAppContext: true,
    });
  }
}
