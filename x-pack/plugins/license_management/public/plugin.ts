/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import { CoreSetup, Plugin, PluginInitializerContext } from '@kbn/core/public';

import { TelemetryPluginStart } from '@kbn/telemetry-plugin/public';
import { ManagementSetup } from '@kbn/management-plugin/public';
import { LicensingPluginSetup } from '@kbn/licensing-plugin/public';
import { PLUGIN } from '../common/constants';
import { ClientConfigType } from './types';
import { AppDependencies } from './application';
import { BreadcrumbService } from './application/breadcrumbs';

interface PluginsDependenciesSetup {
  management: ManagementSetup;
  licensing: LicensingPluginSetup;
}

interface PluginsDependenciesStart {
  telemetry?: TelemetryPluginStart;
}

export interface LicenseManagementUIPluginSetup {
  enabled: boolean;
}
export type LicenseManagementUIPluginStart = void;

export class LicenseManagementUIPlugin
  implements Plugin<LicenseManagementUIPluginSetup, LicenseManagementUIPluginStart, any, any>
{
  private breadcrumbService = new BreadcrumbService();

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  setup(
    coreSetup: CoreSetup<PluginsDependenciesStart>,
    plugins: PluginsDependenciesSetup
  ): LicenseManagementUIPluginSetup {
    const config = this.initializerContext.config.get<ClientConfigType>();

    if (!config.ui.enabled) {
      // No need to go any further
      return {
        enabled: false,
      };
    }

    const { getStartServices } = coreSetup;
    const { management, licensing } = plugins;

    management.sections.section.stack.registerApp({
      id: PLUGIN.id,
      title: PLUGIN.title,
      order: 0,
      mount: async ({ element, setBreadcrumbs, history, theme$ }) => {
        const [coreStart, { telemetry }] = await getStartServices();
        const initialLicense = await firstValueFrom(plugins.licensing.license$);

        // Setup documentation links
        const {
          docLinks,
          chrome: { docTitle },
        } = coreStart;
        const appDocLinks = {
          security: docLinks.links.security.elasticsearchSettings,
        };

        docTitle.change(PLUGIN.title);

        // Setup services
        this.breadcrumbService.setup(setBreadcrumbs);

        const appDependencies: AppDependencies = {
          core: coreStart,
          config,
          plugins: {
            licensing,
            telemetry,
          },
          services: {
            breadcrumbService: this.breadcrumbService,
            history,
          },
          store: {
            initialLicense,
          },
          docLinks: appDocLinks,
          theme$,
        };

        const { renderApp } = await import('./application');
        const unmountAppCallback = renderApp(element, appDependencies);

        return () => {
          docTitle.reset();
          unmountAppCallback();
        };
      },
    });

    return {
      enabled: true,
    };
  }

  start(): LicenseManagementUIPluginStart {}
  stop() {}
}
