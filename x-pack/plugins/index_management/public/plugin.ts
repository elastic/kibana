/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import SemVer from 'semver/classes/semver';

import { CoreSetup, PluginInitializerContext } from '../../../../src/core/public';
import { setExtensionsService } from './application/store/selectors/extension_service';

import { ExtensionsService } from './services';

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
    } = this.ctx.config.get<ClientConfigType>();

    if (isIndexManagementUiEnabled) {
      const { fleet, usageCollection, management } = plugins;
      const kibanaVersion = new SemVer(this.ctx.env.packageInfo.version);
      management.sections.section.data.registerApp({
        id: PLUGIN.id,
        title: i18n.translate('xpack.idxMgmt.appTitle', { defaultMessage: 'Index Management' }),
        order: 0,
        mount: async (params) => {
          const { mountManagementSection } = await import('./application/mount_management_section');
          return mountManagementSection(
            coreSetup,
            usageCollection,
            params,
            this.extensionsService,
            Boolean(fleet),
            kibanaVersion
          );
        },
      });
    }

    return {
      extensionsService: this.extensionsService.setup(),
    };
  }

  public start() {}
  public stop() {}
}
