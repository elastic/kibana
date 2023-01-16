/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { CloudDataMigrationPluginSetup, CloudDataMigrationPluginStart } from './types';
import { PLUGIN_ID, PLUGIN_NAME } from '../common';
import { BreadcrumbService } from './application/services/breadcrumbs';

export class CloudDataMigrationPlugin implements Plugin<void, CloudDataMigrationPluginStart> {
  private breadcrumbService = new BreadcrumbService();

  public setup(core: CoreSetup, { cloud, management }: CloudDataMigrationPluginSetup) {
    // Only be applies to self-managed instances of Kibana. Any Kibana instance running on
    // Elastic Cloud should not show any information related to migration.
    if (!cloud.isCloudEnabled) {
      management.sections.section.data.registerApp({
        id: PLUGIN_ID,
        title: PLUGIN_NAME,
        order: 8,
        mount: async (params: ManagementAppMountParams) => {
          const [coreStart] = await core.getStartServices();
          const { setBreadcrumbs } = params;

          // Initialize services
          this.breadcrumbService.setup(setBreadcrumbs);

          const { renderApp } = await import('./application');
          // Render the application
          const unmountAppCallback = renderApp(coreStart, this.breadcrumbService, params);

          return () => {
            unmountAppCallback();
          };
        },
      });
    }
  }

  public start(core: CoreStart): CloudDataMigrationPluginStart {
    return {};
  }

  public stop() {}
}
