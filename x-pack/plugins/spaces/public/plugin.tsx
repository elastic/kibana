/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, CoreStart, Plugin } from 'src/core/public';
import { HomePublicPluginSetup } from 'src/plugins/home/public';
import { SavedObjectsManagementAction } from 'src/legacy/core_plugins/management/public';
import { ManagementStart, ManagementSetup } from 'src/plugins/management/public';
import { AdvancedSettingsSetup } from 'src/plugins/advanced_settings/public';
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
}

export interface PluginsStart {
  management?: ManagementStart;
  security?: SecurityPluginStart;
}

interface LegacyAPI {
  registerSavedObjectsManagementAction: (action: SavedObjectsManagementAction) => void;
}

export type SpacesPluginSetup = ReturnType<SpacesPlugin['setup']>;
export type SpacesPluginStart = ReturnType<SpacesPlugin['start']>;

export class SpacesPlugin implements Plugin<SpacesPluginSetup, SpacesPluginStart> {
  private spacesManager!: SpacesManager;

  private managementService?: ManagementService;

  public setup(core: CoreSetup, plugins: PluginsSetup) {
    const serverBasePath = core.injectedMetadata.getInjectedVar('serverBasePath') as string;
    this.spacesManager = new SpacesManager(serverBasePath, core.http);

    if (plugins.home) {
      plugins.home.featureCatalogue.register(createSpacesFeatureCatalogueEntry());
    }

    if (plugins.management) {
      this.managementService = new ManagementService();
      this.managementService.setup({
        management: plugins.management,
        getStartServices: core.getStartServices,
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

    spaceSelectorApp.create({
      getStartServices: core.getStartServices,
      application: core.application,
      spacesManager: this.spacesManager,
    });

    return {
      registerLegacyAPI: (legacyAPI: LegacyAPI) => {
        const copySavedObjectsToSpaceService = new CopySavedObjectsToSpaceService();
        copySavedObjectsToSpaceService.setup({
          spacesManager: this.spacesManager,
          managementSetup: {
            savedObjects: {
              registry: {
                register: action => legacyAPI.registerSavedObjectsManagementAction(action),
                has: () => {
                  throw new Error('not available in legacy shim');
                },
                get: () => {
                  throw new Error('not available in legacy shim');
                },
              },
            },
          },
          notificationsSetup: core.notifications,
        });
      },
    };
  }

  public start(core: CoreStart, plugins: PluginsStart) {
    initSpacesNavControl(this.spacesManager, core);

    if (this.managementService) {
      this.managementService.start({ capabilities: core.application.capabilities });
    }

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
