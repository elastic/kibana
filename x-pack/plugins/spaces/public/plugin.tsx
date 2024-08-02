/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { FeaturesPluginStart } from '@kbn/features-plugin/public';
import type { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import type { ManagementSetup, ManagementStart } from '@kbn/management-plugin/public';
import type { SecurityPluginStart } from '@kbn/security-plugin-types-public';

import { EventTracker, registerAnalyticsContext, registerSpacesEventTypes } from './analytics';
import type { ConfigType } from './config';
import { createSpacesFeatureCatalogueEntry } from './create_feature_catalogue_entry';
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
  private eventTracker!: EventTracker;

  private managementService?: ManagementService;
  private config: ConfigType;
  private readonly isServerless: boolean;

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

    const onCloud = plugins.cloud !== undefined && plugins.cloud.isCloudEnabled;
    if (!onCloud) {
      this.config = {
        ...this.config,
        allowSolutionVisibility: false,
      };
    }
    registerSpacesEventTypes(core);
    this.eventTracker = new EventTracker(core.analytics);

    // Only skip setup of space selector and management service if serverless and only one space is allowed
    if (!(this.isServerless && hasOnlyDefaultSpace)) {
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
          eventTracker: this.eventTracker,
        });
      }

      spaceSelectorApp.create({
        getStartServices: core.getStartServices,
        application: core.application,
        spacesManager: this.spacesManager,
      });
    }

    registerAnalyticsContext(core.analytics, this.spacesManager.onActiveSpaceChange$);

    return { hasOnlyDefaultSpace };
  }

  public start(core: CoreStart) {
    // Only skip spaces navigation if serverless and only one space is allowed
    if (!(this.isServerless && this.config.maxSpaces === 1)) {
      initSpacesNavControl(this.spacesManager, core, this.config, this.eventTracker);
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
