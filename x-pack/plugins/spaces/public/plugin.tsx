/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AdvancedSettingsSetup } from '@kbn/advanced-settings-plugin/public';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { FeaturesPluginStart } from '@kbn/features-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';

import { AdvancedSettingsService } from './advanced_settings';
import { createSpacesFeatureCatalogueEntry } from './create_feature_catalogue_entry';
import { ManagementService } from './management';
import { initSpacesNavControl } from './nav_control';
import { spaceSelectorApp } from './space_selector';
import { SpacesManager } from './spaces_manager';
import type { SpacesApi } from './types';
import { getUiApi } from './ui_api';

export interface PluginsSetup {
  advancedSettings?: AdvancedSettingsSetup;
  home?: HomePublicPluginSetup;
  management?: ManagementSetup;
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
      getActiveSpace$: () => this.spacesManager.onActiveSpaceChange$,
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

    spaceSelectorApp.create({
      getStartServices: core.getStartServices,
      application: core.application,
      spacesManager: this.spacesManager,
    });

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
