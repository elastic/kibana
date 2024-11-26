/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Subject } from 'rxjs';
import SemVer from 'semver/classes/semver';

import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  ScopedHistory,
  Capabilities,
} from '@kbn/core/public';
import {
  IndexManagementPluginSetup,
  IndexManagementPluginStart,
} from '@kbn/index-management-shared-types';
import { IndexManagementLocator } from '@kbn/index-management-shared-types';
import { Subscription } from 'rxjs';
import { setExtensionsService } from './application/store/selectors/extension_service';
import { ExtensionsService } from './services/extensions_service';

import { ClientConfigType, SetupDependencies, StartDependencies } from './types';

// avoid import from index files in plugin.ts, use specific import paths
import { PLUGIN } from '../common/constants/plugin';
import { IndexMapping } from './application/sections/home/index_list/details_page/with_context_components/index_mappings_embeddable';
import { PublicApiService } from './services/public_api_service';
import { IndexSettings } from './application/sections/home/index_list/details_page/with_context_components/index_settings_embeddable';
import { IndexManagementLocatorDefinition } from './locator';

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
  private locator?: IndexManagementLocator;
  private kibanaVersion: SemVer;
  private config: {
    enableIndexActions: boolean;
    enableLegacyTemplates: boolean;
    enableIndexStats: boolean;
    enableDataStreamStats: boolean;
    enableSizeAndDocCount: boolean;
    editableIndexSettings: 'all' | 'limited';
    enableMappingsSourceFieldSection: boolean;
    enableTogglingDataRetention: boolean;
    enableProjectLevelRetentionChecks: boolean;
    enableSemanticText: boolean;
  };
  private canUseSyntheticSource: boolean = false;
  private licensingSubscription?: Subscription;

  private capabilities$ = new Subject<Capabilities>();

  constructor(ctx: PluginInitializerContext) {
    // Temporary hack to provide the service instances in module files in order to avoid a big refactor
    // For the selectors we should expose them through app dependencies and read them from there on each container component.
    setExtensionsService(this.extensionsService);
    this.kibanaVersion = new SemVer(ctx.env.packageInfo.version);
    const {
      enableIndexActions,
      enableLegacyTemplates,
      enableIndexStats,
      enableDataStreamStats,
      enableSizeAndDocCount,
      editableIndexSettings,
      enableMappingsSourceFieldSection,
      enableTogglingDataRetention,
      enableProjectLevelRetentionChecks,
      dev: { enableSemanticText },
    } = ctx.config.get<ClientConfigType>();
    this.config = {
      enableIndexActions: enableIndexActions ?? true,
      enableLegacyTemplates: enableLegacyTemplates ?? true,
      enableIndexStats: enableIndexStats ?? true,
      enableDataStreamStats: enableDataStreamStats ?? true,
      enableSizeAndDocCount: enableSizeAndDocCount ?? false,
      editableIndexSettings: editableIndexSettings ?? 'all',
      enableMappingsSourceFieldSection: enableMappingsSourceFieldSection ?? true,
      enableTogglingDataRetention: enableTogglingDataRetention ?? true,
      enableProjectLevelRetentionChecks: enableProjectLevelRetentionChecks ?? false,
      enableSemanticText: enableSemanticText ?? true,
    };
  }

  public setup(
    coreSetup: CoreSetup<StartDependencies>,
    plugins: SetupDependencies
  ): IndexManagementPluginSetup {
    const { fleet, usageCollection, management, cloud } = plugins;

    this.capabilities$.subscribe((capabilities) => {
      const { monitor, manageEnrich, monitorEnrich } = capabilities.index_management;
      if (monitor || manageEnrich || monitorEnrich) {
        management.sections.section.data.registerApp({
          id: PLUGIN.id,
          title: i18n.translate('xpack.idxMgmt.appTitle', { defaultMessage: 'Index Management' }),
          order: 0,
          mount: async (params) => {
            const { mountManagementSection } = await import(
              './application/mount_management_section'
            );
            return mountManagementSection({
              coreSetup,
              usageCollection,
              params,
              extensionsService: this.extensionsService,
              isFleetEnabled: Boolean(fleet),
              kibanaVersion: this.kibanaVersion,
              config: this.config,
              cloud,
              canUseSyntheticSource: this.canUseSyntheticSource,
            });
          },
        });
      }
    });

    this.locator = plugins.share.url.locators.create(
      new IndexManagementLocatorDefinition({
        managementAppLocator: plugins.management.locator,
      })
    );

    return {
      apiService: new PublicApiService(coreSetup.http),
      extensionsService: this.extensionsService.setup(),
      locator: this.locator,
    };
  }

  public start(coreStart: CoreStart, plugins: StartDependencies): IndexManagementPluginStart {
    const { fleet, usageCollection, cloud, share, console, ml, licensing } = plugins;

    this.capabilities$.next(coreStart.application.capabilities);

    this.licensingSubscription = licensing?.license$.subscribe((next) => {
      this.canUseSyntheticSource = next.hasAtLeast('enterprise');
    });

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
            ml,
            licensing,
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
      getIndexSettingsComponent: (deps: { history: ScopedHistory<unknown> }) => {
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
            ml,
            licensing,
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
          return IndexSettings({ dependencies: appDependencies, core: coreStart, ...props });
        };
      },
    };
  }
  public stop() {
    this.licensingSubscription?.unsubscribe();
  }
}
