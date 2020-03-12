/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, Plugin, PluginInitializerContext } from 'src/core/public';

import { TelemetryPluginSetup } from '../../../../src/plugins/telemetry/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';
import { LicensingPluginSetup } from '../../../plugins/licensing/public';
import { PLUGIN } from '../common/constants';
import { ClientConfigType } from './types';
import { AppDependencies } from './application';
import { BreadcrumbService } from './application/breadcrumbs';

interface PluginsDependencies {
  telemetry: TelemetryPluginSetup;
  management: ManagementSetup;
  licensing: LicensingPluginSetup;
}

export class LicenseManagementUIPlugin implements Plugin<void, void, any, any> {
  private breadcrumbService = new BreadcrumbService();

  constructor(private readonly initializerContext: PluginInitializerContext) {}

  setup(coreSetup: CoreSetup, plugins: PluginsDependencies) {
    const config = this.initializerContext.config.get<ClientConfigType>();

    if (!config.ui.enabled) {
      // No need to go any further
      return;
    }

    const { getStartServices } = coreSetup;
    const { management } = plugins;

    management.sections.getSection('elasticsearch')!.registerApp({
      id: PLUGIN.id,
      title: PLUGIN.title,
      order: 99,
      mount: async ({ element, setBreadcrumbs }) => {
        const [core] = await getStartServices();
        const initialLicense = await plugins.licensing.license$.toPromise();

        // Setup documentation links
        const { docLinks } = core;
        const { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } = docLinks;
        const esBase = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}`;

        // Setup services
        this.breadcrumbService.setup(setBreadcrumbs);

        const appDependencies: AppDependencies = {
          core,
          config,
          plugins,
          services: {
            breadcrumbService: this.breadcrumbService,
          },
          store: {
            initialLicense,
          },
          docLinks: {
            security: `${esBase}/security-settings.html`,
          },
        };

        const { renderApp } = await import('./application');
        return renderApp(element, appDependencies);
      },
    });
  }

  start() {}
  stop() {}
}
