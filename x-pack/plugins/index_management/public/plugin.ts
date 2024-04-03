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
  Plugin,
  PluginInitializerContext,
  ScopedHistory,
} from '@kbn/core/public';
import {
  ExtensionsService,
  IndexManagementPluginSetup,
  SetupDependencies,
  StartDependencies,
  IndexManagementPluginStart,
} from '@kbn/index-management';
import { setExtensionsService } from './application/store/selectors/extension_service';

import { ClientConfigType } from './types';

// avoid import from index files in plugin.ts, use specific import paths
import { PLUGIN } from '../common/constants/plugin';
import { IndexMapping } from './application/sections/home/index_list/details_page/index_mappings_embeddable';
import { PublicApiService } from './services/public_api_service';

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

  constructor(ctx: PluginInitializerContext) {
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
    const { fleet, usageCollection, cloud, share, console } = plugins;

    return {
      extensionsService: this.extensionsService.setup(),
      getIndexMappingComponent: (deps: { history: ScopedHistory<unknown> }) => {
        const { docLinks, fatalErrors, application, uiSettings, executionContext, settings, http } =
          coreStart;
        const { url } = share;
        const appDependencies = {
          core: {
            fatalErrors,
            getUrlForApp: application.getUrlForApp,
            executionContext,
            application,
            http,
          },
          plugins: {
            usageCollection,
            isFleetEnabled: Boolean(fleet),
            share,
            cloud,
            console,
          },
          services: {
            extensionsService: this.extensionsService,
          },
          config: this.config,
          history: deps.history,
          setBreadcrumbs: undefined as any, // breadcrumbService.setBreadcrumbs,
          uiSettings,
          settings,
          url,
          docLinks,
          kibanaVersion: this.kibanaVersion,
          theme$: coreStart.theme.theme$,
        };
        return (props: any) => {
          return IndexMapping({ dependencies: appDependencies, core: coreStart, ...props });
        };
      },
    };
  }
  public stop() {}
}
