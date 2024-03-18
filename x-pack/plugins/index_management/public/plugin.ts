/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import SemVer from 'semver/classes/semver';

import {
  CoreSetup,
  CoreStart,
  CoreTheme,
  Plugin,
  PluginInitializerContext,
  ScopedHistory,
} from '@kbn/core/public';
import { Observable } from 'rxjs';
import { setExtensionsService } from './application/store/selectors/extension_service';

import { ExtensionsService, PublicApiService } from './services';

import {
  IndexManagementPluginSetup,
  SetupDependencies,
  StartDependencies,
  ClientConfigType,
  IndexManagementPluginStart,
} from './types';

// avoid import from index files in plugin.ts, use specific import paths
import { PLUGIN } from '../common/constants/plugin';
import { DetailsPageMappingsProps } from './application/sections/home/index_list/details_page/details_page_mappings_types';
import { IndexMappings } from './application/sections/home/index_list/details_page/index_mappings_embeddable';
import { getIndexManagementDependencies } from './application/mount_management_section';
import { UiMetricService } from './application/services';
import { IndexManagementAppContext } from './application';
import { httpService } from './application/services/http';
import { notificationService } from './application/services/notification';

export class IndexMgmtUIPlugin
  implements
    Plugin<
      IndexManagementPluginSetup,
      IndexManagementPluginStart,
      SetupDependencies,
      StartDependencies
    >
{
  private extensionsService = new ExtensionsService();
  private kibanaVersion: SemVer;
  private config: {
    enableIndexActions: boolean;
    enableLegacyTemplates: boolean;
    enableIndexStats: boolean;
    editableIndexSettings: 'all' | 'limited';
    enableDataStreamsStorageColumn: boolean;
    isIndexManagementUiEnabled: boolean;
  };

  constructor(private ctx: PluginInitializerContext) {
    // Temporary hack to provide the service instances in module files in order to avoid a big refactor
    // For the selectors we should expose them through app dependencies and read them from there on each container component.
    setExtensionsService(this.extensionsService);
    this.kibanaVersion = new SemVer(ctx.env.packageInfo.version);
    const {
      ui: { enabled: isIndexManagementUiEnabled },
      enableIndexActions,
      enableLegacyTemplates,
      enableIndexStats,
      editableIndexSettings,
      enableDataStreamsStorageColumn,
    } = ctx.config.get<ClientConfigType>();
    this.config = {
      isIndexManagementUiEnabled,
      enableIndexActions: enableIndexActions ?? true,
      enableLegacyTemplates: enableLegacyTemplates ?? true,
      enableIndexStats: enableIndexStats ?? true,
      editableIndexSettings: editableIndexSettings ?? 'all',
      enableDataStreamsStorageColumn: enableDataStreamsStorageColumn ?? true,
    };
  }

  public setup(
    coreSetup: CoreSetup<StartDependencies>,
    plugins: SetupDependencies
  ): IndexManagementPluginSetup {
    if (this.config.isIndexManagementUiEnabled) {
      const { fleet, usageCollection, management, cloud } = plugins;

      management.sections.section.data.registerApp({
        id: PLUGIN.id,
        title: i18n.translate('xpack.idxMgmt.appTitle', { defaultMessage: 'Index Management' }),
        order: 0,
        mount: async (params) => {
          const { mountManagementSection } = await import('./application/mount_management_section');
          return mountManagementSection({
            coreSetup,
            usageCollection,
            params,
            extensionsService: this.extensionsService,
            isFleetEnabled: Boolean(fleet),
            kibanaVersion: this.kibanaVersion,
            config: this.config,
            cloud,
          });
        },
      });
    }

    return {
      apiService: new PublicApiService(coreSetup.http),
      extensionsService: this.extensionsService.setup(),
    };
  }

  public start(coreStart: CoreStart, plugins: StartDependencies): IndexManagementPluginStart {
    const { fleet, usageCollection, cloud } = plugins;

    return {
      extensionsService: this.extensionsService.setup(),
      getIndexMappingComponent: (deps: {
        history: ScopedHistory<unknown>;
        theme$: Observable<CoreTheme>;
      }) => {
        httpService.setup(coreStart.http);
        notificationService.setup(coreStart.notifications);
        const appDependencies = getIndexManagementDependencies({
          core: coreStart,
          usageCollection,
          extensionsService: this.extensionsService,
          history: deps.history,
          isFleetEnabled: Boolean(fleet),
          kibanaVersion: this.kibanaVersion,
          config: this.config,
          cloud,
          startDependencies: plugins,
          theme$: deps.theme$,
          uiMetricService: new UiMetricService('TODO'),
        });
        return (props: DetailsPageMappingsProps) => {
          return IndexManagementAppContext({
            children: IndexMappings(props),
            dependencies: appDependencies,
            core: coreStart,
          });
        };
      },
    };
  }
  public stop() {}
}
