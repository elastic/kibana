/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RecursiveReadonly } from '@kbn/utility-types';
import {
  CoreSetup,
  CoreStart,
  SavedObjectsServiceStart,
  Logger,
  PluginInitializerContext,
} from '../../../../src/core/server';
import { Capabilities as UICapabilities } from '../../../../src/core/server';
import { deepFreeze } from '../../../../src/core/server';
import { PluginSetupContract as TimelionSetupContract } from '../../../../src/plugins/vis_type_timelion/server';
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
  /*
   * Calling this function during setup will crash Kibana.
   * Use start contract instead.
   * @deprecated
   * */
  getFeatures(): Feature[];
  getFeaturesUICapabilities(): UICapabilities;
}

export interface PluginStartContract {
  getFeatures(): Feature[];
}

/**
 * Represents Features Plugin instance that will be managed by the Kibana plugin system.
 */
export class Plugin {
  private readonly logger: Logger;
  private readonly featureRegistry: FeatureRegistry = new FeatureRegistry();
  private isTimelionEnabled: boolean = false;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public async setup(
    core: CoreSetup,
    { visTypeTimelion }: { visTypeTimelion?: TimelionSetupContract }
  ): Promise<RecursiveReadonly<PluginSetupContract>> {
    this.isTimelionEnabled = visTypeTimelion !== undefined && visTypeTimelion.uiEnabled;

    defineRoutes({
      router: core.http.createRouter(),
      featureRegistry: this.featureRegistry,
    });

    return deepFreeze({
      registerFeature: this.featureRegistry.register.bind(this.featureRegistry),
      getFeatures: this.featureRegistry.getAll.bind(this.featureRegistry),
      getFeaturesUICapabilities: () => uiCapabilitiesForFeatures(this.featureRegistry.getAll()),
    });
  }

  public start(core: CoreStart): RecursiveReadonly<PluginStartContract> {
    this.registerOssFeatures(core.savedObjects);

    return deepFreeze({
      getFeatures: this.featureRegistry.getAll.bind(this.featureRegistry),
    });
  }

  public stop() {}

  private registerOssFeatures(savedObjects: SavedObjectsServiceStart) {
    const registry = savedObjects.getTypeRegistry();
    const savedObjectTypes = registry.getVisibleTypes().map((t) => t.name);

    this.logger.debug(
      `Registering OSS features with SO types: ${savedObjectTypes.join(', ')}. "includeTimelion": ${
        this.isTimelionEnabled
      }.`
    );
    const features = buildOSSFeatures({
      savedObjectTypes,
      includeTimelion: this.isTimelionEnabled,
    });

    for (const feature of features) {
      this.featureRegistry.register(feature);
    }
  }
}
