/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CoreSetup,
  Logger,
  PluginInitializerContext,
  RecursiveReadonly,
} from '../../../../src/core/server';
import { Capabilities as UICapabilities } from '../../../../src/core/server';
import { deepFreeze } from '../../../../src/core/utils';
import { XPackInfo } from '../../../legacy/plugins/xpack_main/server/lib/xpack_info';
import { PluginSetupContract as TimelionSetupContract } from '../../../../src/plugins/timelion/server';
import { FeatureRegistry } from './feature_registry';
import { Feature, FeatureConfig } from '../common/feature';
import { uiCapabilitiesForFeatures } from './ui_capabilities_for_features';
import { buildOSSFeatures } from './oss_features';
import { defineRoutes } from './routes';

/**
 * Describes public Features plugin contract returned at the `setup` stage.
 */
export interface PluginSetupContract {
  registerFeature(feature: FeatureConfig): void;
  getFeatures(): Feature[];
  getFeaturesUICapabilities(): UICapabilities;
  registerLegacyAPI: (legacyAPI: LegacyAPI) => void;
}

export interface PluginStartContract {
  getFeatures(): Feature[];
}

/**
 * Describes a set of APIs that are available in the legacy platform only and required by this plugin
 * to function properly.
 */
export interface LegacyAPI {
  xpackInfo: Pick<XPackInfo, 'license'>;
  savedObjectTypes: string[];
}

/**
 * Represents Features Plugin instance that will be managed by the Kibana plugin system.
 */
export class Plugin {
  private readonly logger: Logger;

  private readonly featureRegistry: FeatureRegistry = new FeatureRegistry();

  private legacyAPI?: LegacyAPI;
  private readonly getLegacyAPI = () => {
    if (!this.legacyAPI) {
      throw new Error('Legacy API is not registered!');
    }
    return this.legacyAPI;
  };

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public async setup(
    core: CoreSetup,
    { timelion }: { timelion?: TimelionSetupContract }
  ): Promise<RecursiveReadonly<PluginSetupContract>> {
    defineRoutes({
      router: core.http.createRouter(),
      featureRegistry: this.featureRegistry,
      getLegacyAPI: this.getLegacyAPI,
    });

    return deepFreeze({
      registerFeature: this.featureRegistry.register.bind(this.featureRegistry),
      getFeatures: this.featureRegistry.getAll.bind(this.featureRegistry),
      getFeaturesUICapabilities: () => uiCapabilitiesForFeatures(this.featureRegistry.getAll()),

      registerLegacyAPI: (legacyAPI: LegacyAPI) => {
        this.legacyAPI = legacyAPI;

        // Register OSS features.
        for (const feature of buildOSSFeatures({
          savedObjectTypes: this.legacyAPI.savedObjectTypes,
          includeTimelion: timelion !== undefined && timelion.uiEnabled,
        })) {
          this.featureRegistry.register(feature);
        }
      },
    });
  }

  public start(): RecursiveReadonly<PluginStartContract> {
    this.logger.debug('Starting plugin');
    return deepFreeze({
      getFeatures: this.featureRegistry.getAll.bind(this.featureRegistry),
    });
  }

  public stop() {
    this.logger.debug('Stopping plugin');
  }
}
