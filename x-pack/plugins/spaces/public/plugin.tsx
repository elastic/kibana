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
import { ShareSavedObjectsToSpaceService } from './share_saved_objects_to_space';
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
  private spacesManager: Promise<SpacesManager>;
  private setSpacesManager!: (spacesManager: SpacesManager) => void;

  constructor() {
    this.spacesManager = new Promise<SpacesManager>((resolve) => (this.setSpacesManager = resolve));
  }

  private managementService?: ManagementService;

  public setup(core: CoreSetup, plugins: PluginsSetup) {
    if (plugins.home) {
      plugins.home.featureCatalogue.register(createSpacesFeatureCatalogueEntry());
    }

    if (plugins.management) {
      this.managementService = new ManagementService();
      this.managementService.setup({
        management: plugins.management,
        getStartServices: core.getStartServices as CoreSetup<PluginsStart>['getStartServices'],
        getSpacesManager: () => this.spacesManager,
        securityLicense: plugins.security?.license,
      });
    }

    if (plugins.advancedSettings) {
      const advancedSettingsService = new AdvancedSettingsService();
      advancedSettingsService.setup({
        getActiveSpace: async () => (await this.spacesManager).getActiveSpace(),
        componentRegistry: plugins.advancedSettings.component,
      });
    }

    if (plugins.savedObjectsManagement) {
      const shareSavedObjectsToSpaceService = new ShareSavedObjectsToSpaceService();
      shareSavedObjectsToSpaceService.setup({
        getSpacesManager: () => this.spacesManager,
        notificationsSetup: core.notifications,
        savedObjectsManagementSetup: plugins.savedObjectsManagement,
      });
      const copySavedObjectsToSpaceService = new CopySavedObjectsToSpaceService();
      copySavedObjectsToSpaceService.setup({
        getSpacesManager: () => this.spacesManager,
        notificationsSetup: core.notifications,
        savedObjectsManagementSetup: plugins.savedObjectsManagement,
      });
    }

    spaceSelectorApp.create({
      getStartServices: core.getStartServices,
      application: core.application,
      getSpacesManager: () => this.spacesManager,
    });

    return {};
  }

  public start(core: CoreStart, plugins: PluginsStart) {
    const spacesManager = new SpacesManager(core.http);
    this.setSpacesManager(spacesManager);
    initSpacesNavControl(spacesManager, core);

    return {
      activeSpace$: spacesManager.onActiveSpaceChange$,
      getActiveSpace: () => spacesManager.getActiveSpace(),
    };
  }

  public stop() {
    if (this.managementService) {
      this.managementService.stop();
      this.managementService = undefined;
    }
  }
}
