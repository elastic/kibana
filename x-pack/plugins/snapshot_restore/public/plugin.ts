/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { CoreSetup, PluginInitializerContext } from 'src/core/public';

import { UsageCollectionSetup } from '../../../../src/plugins/usage_collection/public';
import { ManagementSetup } from '../../../../src/plugins/management/public';
import { PLUGIN } from '../common/constants';
import { AppDependencies } from './application';
import { ClientConfigType } from './types';

import { breadcrumbService, docTitleService } from './application/services/navigation';
import { documentationLinksService } from './application/services/documentation';
import { httpService, setUiMetricService } from './application/services/http';
import { textService } from './application/services/text';
import { UiMetricService } from './application/services';
import { UIM_APP_NAME } from './application/constants';

interface PluginsDependencies {
  usageCollection: UsageCollectionSetup;
  management: ManagementSetup;
}

export class SnapshotRestoreUIPlugin {
  private uiMetricService = new UiMetricService(UIM_APP_NAME);

  constructor(private readonly initializerContext: PluginInitializerContext) {
    // Temporary hack to provide the service instances in module files in order to avoid a big refactor
    setUiMetricService(this.uiMetricService);
  }

  public setup(coreSetup: CoreSetup, plugins: PluginsDependencies): void {
    const config = this.initializerContext.config.get<ClientConfigType>();
    const { http, getStartServices } = coreSetup;
    const { management, usageCollection } = plugins;

    // Initialize services
    this.uiMetricService.setup(usageCollection);
    textService.setup(i18n);
    httpService.setup(http);

    management.sections.getSection('elasticsearch')!.registerApp({
      id: PLUGIN.id,
      title: i18n.translate('xpack.snapshotRestore.appTitle', {
        defaultMessage: 'Snapshot and Restore',
      }),
      order: 7,
      mount: async ({ element, setBreadcrumbs }) => {
        const [core] = await getStartServices();
        const {
          docLinks,
          chrome: { docTitle },
        } = core;

        docTitleService.setup(docTitle.change);
        breadcrumbService.setup(setBreadcrumbs);
        documentationLinksService.setup(docLinks);

        const appDependencies: AppDependencies = {
          core,
          config,
          services: {
            httpService,
            uiMetricService: this.uiMetricService,
            i18n,
          },
        };

        const { renderApp } = await import('./application');
        return renderApp(element, appDependencies);
      },
    });
  }

  public start() {}
  public stop() {}
}
