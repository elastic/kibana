/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CoreSetup, PluginInitializerContext } from '@kbn/core/public';
import { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';
import { ManagementSetup } from '@kbn/management-plugin/public';
import { SharePluginSetup } from '@kbn/share-plugin/public';
import { FeatureCatalogueCategory, HomePublicPluginSetup } from '@kbn/home-plugin/public';

import { PLUGIN } from '../common/constants';

import { ClientConfigType } from './types';

import { httpService, setUiMetricService } from './application/services/http';
import { textService } from './application/services/text';
import { UiMetricService } from './application/services';
import { UIM_APP_NAME } from './application/constants';
import { SnapshotRestoreLocatorDefinition } from './locator';

interface PluginsDependencies {
  usageCollection: UsageCollectionSetup;
  management: ManagementSetup;
  share: SharePluginSetup;
  home?: HomePublicPluginSetup;
}

export class SnapshotRestoreUIPlugin {
  private uiMetricService = new UiMetricService(UIM_APP_NAME);

  constructor(private readonly initializerContext: PluginInitializerContext) {
    // Temporary hack to provide the service instances in module files in order to avoid a big refactor
    setUiMetricService(this.uiMetricService);
  }

  public setup(coreSetup: CoreSetup, plugins: PluginsDependencies): void {
    const config = this.initializerContext.config.get<ClientConfigType>();
    const {
      ui: { enabled: isSnapshotRestoreUiEnabled },
    } = config;

    if (isSnapshotRestoreUiEnabled) {
      const { http } = coreSetup;
      const { home, management, usageCollection } = plugins;

      // Initialize services
      this.uiMetricService.setup(usageCollection);
      textService.setup(i18n);
      httpService.setup(http);

      management.sections.section.data.registerApp({
        id: PLUGIN.id,
        title: i18n.translate('xpack.snapshotRestore.appTitle', {
          defaultMessage: 'Snapshot and Restore',
        }),
        order: 3,
        mount: async (params) => {
          const { mountManagementSection } = await import('./application/mount_management_section');
          const services = {
            uiMetricService: this.uiMetricService,
          };
          return await mountManagementSection(coreSetup, services, config, params);
        },
      });

      if (home) {
        home.featureCatalogue.register({
          id: PLUGIN.id,
          title: i18n.translate('xpack.snapshotRestore.featureCatalogueTitle', {
            defaultMessage: 'Back up and restore',
          }),
          description: i18n.translate('xpack.snapshotRestore.featureCatalogueDescription', {
            defaultMessage:
              'Save snapshots to a backup repository, and restore to recover index and cluster state.',
          }),
          icon: 'storage',
          path: '/app/management/data/snapshot_restore',
          showOnHomePage: true,
          category: FeatureCatalogueCategory.ADMIN,
          order: 630,
        });
      }

      plugins.share.url.locators.create(
        new SnapshotRestoreLocatorDefinition({
          managementAppLocator: plugins.management.locator,
        })
      );
    }
  }

  public start() {}
  public stop() {}
}
