/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { HomePublicPluginSetup } from 'src/plugins/home/public';
import { SavedObjectsManagementPluginSetup } from 'src/plugins/saved_objects_management/public';
import { ManagementStart, ManagementSetup } from 'src/plugins/management/public';
import { AdvancedSettingsSetup } from 'src/plugins/advanced_settings/public';
import { FeaturesPluginStart } from '../../features/public';
import { SecurityPluginStart, SecurityPluginSetup } from '../../security/public';
import { SpacesManager } from './spaces_manager';
import { initSpacesNavControl } from './nav_control';
import { createSpacesFeatureCatalogueEntry } from './create_feature_catalogue_entry';
import { CopySavedObjectsToSpaceService } from './copy_saved_objects_to_space';
import { AdvancedSettingsService } from './advanced_settings';
import { ManagementService } from './management';
import { spaceSelectorApp } from './space_selector';

export interface PluginsSetup {
  advancedSettings?: AdvancedSettingsSetup;
  home?: HomePublicPluginSetup;
  management?: ManagementSetup;
  security?: SecurityPluginSetup;
  savedObjectsManagement?: SavedObjectsManagementPluginSetup;
}

export interface PluginsStart {
  features: FeaturesPluginStart;
  management?: ManagementStart;
  security?: SecurityPluginStart;
}

export type SpacesPluginSetup = ReturnType<SpacesPlugin['setup']>;
export type SpacesPluginStart = ReturnType<SpacesPlugin['start']>;

export class SpacesPlugin implements Plugin<SpacesPluginSetup, SpacesPluginStart> {
  private spacesManager!: SpacesManager;

  private managementService?: ManagementService;

  public setup(core: CoreSetup, plugins: PluginsSetup) {
    this.spacesManager = new SpacesManager(core.http);

    if (plugins.home) {
      plugins.home.featureCatalogue.register(createSpacesFeatureCatalogueEntry());
    }

    if (plugins.management) {
      this.managementService = new ManagementService();
      this.managementService.setup({
        management: plugins.management,
        getStartServices: core.getStartServices as CoreSetup<PluginsStart>['getStartServices'],
        spacesManager: this.spacesManager,
        securityLicense: plugins.security?.license,
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
      const copySavedObjectsToSpaceService = new CopySavedObjectsToSpaceService();
      copySavedObjectsToSpaceService.setup({
        spacesManager: this.spacesManager,
        notificationsSetup: core.notifications,
        savedObjectsManagementSetup: plugins.savedObjectsManagement,
      });
    }

    spaceSelectorApp.create({
      getStartServices: core.getStartServices,
      application: core.application,
      spacesManager: this.spacesManager,
    });

    return {};
  }

  public start(core: CoreStart, plugins: PluginsStart) {
    initSpacesNavControl(this.spacesManager, core);

    return {
      activeSpace$: this.spacesManager.onActiveSpaceChange$,
      getActiveSpace: () => this.spacesManager.getActiveSpace(),
    };
  }

  public stop() {
    if (this.managementService) {
      this.managementService.stop();
      this.managementService = undefined;
    }
  }
}
