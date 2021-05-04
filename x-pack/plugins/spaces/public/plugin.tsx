/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import type { AdvancedSettingsSetup } from 'src/plugins/advanced_settings/public';
import type { HomePublicPluginSetup } from 'src/plugins/home/public';
import type { ManagementSetup, ManagementStart } from 'src/plugins/management/public';
import type { SavedObjectsManagementPluginSetup } from 'src/plugins/saved_objects_management/public';
import type { SpacesApi, SpacesOssPluginSetup } from 'src/plugins/spaces_oss/public';

import type { FeaturesPluginStart } from '../../features/public';
import { AdvancedSettingsService } from './advanced_settings';
import { CopySavedObjectsToSpaceService } from './copy_saved_objects_to_space';
import { createSpacesFeatureCatalogueEntry } from './create_feature_catalogue_entry';
import { ManagementService } from './management';
import { initSpacesNavControl } from './nav_control';
import { ShareSavedObjectsToSpaceService } from './share_saved_objects_to_space';
import { spaceSelectorApp } from './space_selector';
import { SpacesManager } from './spaces_manager';
import { getUiApi } from './ui_api';

export interface PluginsSetup {
  spacesOss: SpacesOssPluginSetup;
  advancedSettings?: AdvancedSettingsSetup;
  home?: HomePublicPluginSetup;
  management?: ManagementSetup;
  savedObjectsManagement?: SavedObjectsManagementPluginSetup;
}

export interface PluginsStart {
  features: FeaturesPluginStart;
  management?: ManagementStart;
}

/**
 * Setup contract for the Spaces plugin.
 */
export type SpacesPluginSetup = ReturnType<SpacesPlugin['setup']>;

/**
 * Start contract for the Spaces plugin.
 */
export type SpacesPluginStart = ReturnType<SpacesPlugin['start']>;

export class SpacesPlugin implements Plugin<SpacesPluginSetup, SpacesPluginStart> {
  private spacesManager!: SpacesManager;
  private spacesApi!: SpacesApi;

  private managementService?: ManagementService;

  public setup(core: CoreSetup<PluginsStart, SpacesPluginStart>, plugins: PluginsSetup) {
    this.spacesManager = new SpacesManager(core.http);
    this.spacesApi = {
      ui: getUiApi({
        spacesManager: this.spacesManager,
        getStartServices: core.getStartServices,
      }),
      activeSpace$: this.spacesManager.onActiveSpaceChange$,
      getActiveSpace: () => this.spacesManager.getActiveSpace(),
    };

    if (plugins.home) {
      plugins.home.featureCatalogue.register(createSpacesFeatureCatalogueEntry());
    }

    if (plugins.management) {
      this.managementService = new ManagementService();
      this.managementService.setup({
        management: plugins.management,
        getStartServices: core.getStartServices,
        spacesManager: this.spacesManager,
      });
    }

    if (plugins.advancedSettings) {
      const advancedSettingsService = new AdvancedSettingsService();
      advancedSettingsService.setup({
        getActiveSpace: () => this.spacesManager.getActiveSpace(),
        componentRegistry: plugins.advancedSettings.component,
      });
    }

    if (plugins.savedObjectsManagement) {
      const shareSavedObjectsToSpaceService = new ShareSavedObjectsToSpaceService();
      shareSavedObjectsToSpaceService.setup({
        savedObjectsManagementSetup: plugins.savedObjectsManagement,
        spacesApiUi: this.spacesApi.ui,
      });
      const copySavedObjectsToSpaceService = new CopySavedObjectsToSpaceService();
      copySavedObjectsToSpaceService.setup({
        savedObjectsManagementSetup: plugins.savedObjectsManagement,
        getStartServices: core.getStartServices,
      });
    }

    spaceSelectorApp.create({
      getStartServices: core.getStartServices,
      application: core.application,
      spacesManager: this.spacesManager,
    });

    plugins.spacesOss.registerSpacesApi(this.spacesApi);

    return {};
  }

  public start(core: CoreStart) {
    initSpacesNavControl(this.spacesManager, core);

    return this.spacesApi;
  }

  public stop() {
    if (this.managementService) {
      this.managementService.stop();
      this.managementService = undefined;
    }
  }
}
