/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RecursiveReadonly } from '@kbn/utility-types';
import { deepFreeze } from '@kbn/std';
import {
  CoreSetup,
  CoreStart,
  SavedObjectsServiceStart,
  Logger,
  PluginInitializerContext,
} from '../../../../src/core/server';
import { Capabilities as UICapabilities } from '../../../../src/core/server';
import { FeatureRegistry } from './feature_registry';
import { uiCapabilitiesForFeatures } from './ui_capabilities_for_features';
import { buildOSSFeatures } from './oss_features';
import { defineRoutes } from './routes';
import {
  ElasticsearchFeatureConfig,
  ElasticsearchFeature,
  KibanaFeature,
  KibanaFeatureConfig,
} from '../common';

/**
 * Describes public Features plugin contract returned at the `setup` stage.
 */
export interface PluginSetupContract {
  registerKibanaFeature(feature: KibanaFeatureConfig): void;
  registerElasticsearchFeature(feature: ElasticsearchFeatureConfig): void;
  /*
   * Calling this function during setup will crash Kibana.
   * Use start contract instead.
   * @deprecated
   * */
  getKibanaFeatures(): KibanaFeature[];
  /*
   * Calling this function during setup will crash Kibana.
   * Use start contract instead.
   * @deprecated
   * */
  getElasticsearchFeatures(): ElasticsearchFeature[];
  getFeaturesUICapabilities(): UICapabilities;
}

export interface PluginStartContract {
  getElasticsearchFeatures(): ElasticsearchFeature[];
  getKibanaFeatures(): KibanaFeature[];
}

interface TimelionSetupContract {
  uiEnabled: boolean;
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

    const getFeaturesUICapabilities = () =>
      uiCapabilitiesForFeatures(
        this.featureRegistry.getAllKibanaFeatures(),
        this.featureRegistry.getAllElasticsearchFeatures()
      );

    core.capabilities.registerProvider(getFeaturesUICapabilities);

    return deepFreeze({
      registerKibanaFeature: this.featureRegistry.registerKibanaFeature.bind(this.featureRegistry),
      registerElasticsearchFeature: this.featureRegistry.registerElasticsearchFeature.bind(
        this.featureRegistry
      ),
      getKibanaFeatures: this.featureRegistry.getAllKibanaFeatures.bind(this.featureRegistry),
      getElasticsearchFeatures: this.featureRegistry.getAllElasticsearchFeatures.bind(
        this.featureRegistry
      ),
      getFeaturesUICapabilities,
    });
  }

  public start(core: CoreStart): RecursiveReadonly<PluginStartContract> {
    this.registerOssFeatures(core.savedObjects);

    return deepFreeze({
      getElasticsearchFeatures: this.featureRegistry.getAllElasticsearchFeatures.bind(
        this.featureRegistry
      ),
      getKibanaFeatures: this.featureRegistry.getAllKibanaFeatures.bind(this.featureRegistry),
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
      this.featureRegistry.registerKibanaFeature(feature);
    }
  }
}
