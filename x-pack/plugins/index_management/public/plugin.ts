/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import SemVer from 'semver/classes/semver';

import { CoreSetup, PluginInitializerContext } from '@kbn/core/public';
import { setExtensionsService } from './application/store/selectors/extension_service';

import { ExtensionsService, PublicApiService } from './services';

import {
  IndexManagementPluginSetup,
  SetupDependencies,
  StartDependencies,
  ClientConfigType,
} from './types';

// avoid import from index files in plugin.ts, use specific import paths
import { PLUGIN } from '../common/constants/plugin';

export class IndexMgmtUIPlugin {
  private extensionsService = new ExtensionsService();

  constructor(private ctx: PluginInitializerContext) {
    // Temporary hack to provide the service instances in module files in order to avoid a big refactor
    // For the selectors we should expose them through app dependencies and read them from there on each container component.
    setExtensionsService(this.extensionsService);
  }

  public setup(
    coreSetup: CoreSetup<StartDependencies>,
    plugins: SetupDependencies
  ): IndexManagementPluginSetup {
    const {
      ui: { enabled: isIndexManagementUiEnabled },
      enableIndexActions,
      enableLegacyTemplates,
      enableIndexStats,
      editableIndexSettings,
      enableDataStreamsStorageColumn,
    } = this.ctx.config.get<ClientConfigType>();

    if (isIndexManagementUiEnabled) {
      const { fleet, usageCollection, management, cloud } = plugins;
      const kibanaVersion = new SemVer(this.ctx.env.packageInfo.version);
      const config = {
        enableIndexActions: enableIndexActions ?? true,
        enableLegacyTemplates: enableLegacyTemplates ?? true,
        enableIndexStats: enableIndexStats ?? true,
        editableIndexSettings: editableIndexSettings ?? 'all',
        enableDataStreamsStorageColumn: enableDataStreamsStorageColumn ?? true,
      };
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
            kibanaVersion,
            config,
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

  public start() {}
  public stop() {}
}
