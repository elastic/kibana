/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudExperimentsPluginStart } from '@kbn/cloud-experiments-plugin/common';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { FeaturesPluginStart } from '@kbn/features-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-public';

import type { ConfigType } from './config';
import { createSpacesFeatureCatalogueEntry } from './create_feature_catalogue_entry';
import { isSolutionNavEnabled } from './experiments';
import { ManagementService } from './management';
import { initSpacesNavControl } from './nav_control';
import { spaceSelectorApp } from './space_selector';
import { SpacesManager } from './spaces_manager';
import type { SpacesApi } from './types';
import { getUiApi } from './ui_api';

export interface PluginsSetup {
  home?: HomePublicPluginSetup;
  management?: ManagementSetup;
  cloud?: CloudSetup;
}

export interface PluginsStart {
  features: FeaturesPluginStart;
  management?: ManagementStart;
  cloud?: CloudStart;
  cloudExperiments?: CloudExperimentsPluginStart;
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
  private readonly config: ConfigType;
  private readonly isServerless: boolean;
  private solutionNavExperiment = Promise.resolve(false);

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.config = this.initializerContext.config.get<ConfigType>();
    this.isServerless = this.initializerContext.env.packageInfo.buildFlavor === 'serverless';
  }

  public setup(core: CoreSetup<PluginsStart, SpacesPluginStart>, plugins: PluginsSetup) {
    const hasOnlyDefaultSpace = this.config.maxSpaces === 1;
    this.spacesManager = new SpacesManager(core.http);
    this.spacesApi = {
      ui: getUiApi({
        spacesManager: this.spacesManager,
        getStartServices: core.getStartServices,
      }),
      getActiveSpace$: () => this.spacesManager.onActiveSpaceChange$,
      getActiveSpace: () => this.spacesManager.getActiveSpace(),
      hasOnlyDefaultSpace,
    };

    this.solutionNavExperiment = core
      .getStartServices()
      .then(([, { cloud, cloudExperiments }]) => isSolutionNavEnabled(cloud, cloudExperiments))
      .catch((err) => {
        this.initializerContext.logger.get().error(`Failed to retrieve cloud experiment: ${err}`);

        return false;
      });

    if (!this.isServerless) {
      const getRolesAPIClient = async () => {
        const { security } = await core.plugins.onSetup<{ security: SecurityPluginStart }>(
          'security'
        );

        if (!security.found) {
          throw new Error('Security plugin is not available as runtime dependency.');
        }

        return security.contract.authz.roles;
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
          config: this.config,
          getRolesAPIClient,
          solutionNavExperiment: this.solutionNavExperiment,
        });
      }

      spaceSelectorApp.create({
        getStartServices: core.getStartServices,
        application: core.application,
        spacesManager: this.spacesManager,
      });
    }

    return { hasOnlyDefaultSpace };
  }

  public start(core: CoreStart) {
    if (!this.isServerless) {
      initSpacesNavControl(this.spacesManager, core, this.solutionNavExperiment);
    }

    return this.spacesApi;
  }

  public stop() {
    if (this.managementService) {
      this.managementService.stop();
      this.managementService = undefined;
    }
  }
}
