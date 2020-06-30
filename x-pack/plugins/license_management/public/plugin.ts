/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { first } from 'rxjs/operators';
import { CoreSetup, Plugin, PluginInitializerContext } from 'src/core/public';

import { TelemetryPluginStart } from '../../../../src/plugins/telemetry/public';
import { ManagementSetup, ManagementSectionId } from '../../../../src/plugins/management/public';
import { LicensingPluginSetup } from '../../../plugins/licensing/public';
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
  implements Plugin<LicenseManagementUIPluginSetup, LicenseManagementUIPluginStart, any, any> {
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

    management.sections.getSection(ManagementSectionId.Stack).registerApp({
      id: PLUGIN.id,
      title: PLUGIN.title,
      order: 0,
      mount: async ({ element, setBreadcrumbs, history }) => {
        const [core, { telemetry }] = await getStartServices();
        const initialLicense = await plugins.licensing.license$.pipe(first()).toPromise();

        // Setup documentation links
        const { docLinks } = core;
        const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;
        const esBase = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}`;
        const appDocLinks = {
          security: `${esBase}/security-settings.html`,
        };

        // Setup services
        this.breadcrumbService.setup(setBreadcrumbs);

        const appDependencies: AppDependencies = {
          core,
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
        };

        const { renderApp } = await import('./application');

        return renderApp(element, appDependencies);
      },
    });

    return {
      enabled: true,
    };
  }

  start(): LicenseManagementUIPluginStart {}
  stop() {}
}
