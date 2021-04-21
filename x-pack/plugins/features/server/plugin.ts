/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RecursiveReadonly } from '@kbn/utility-types';
import { deepFreeze } from '@kbn/std';
import {
  CoreSetup,
  CoreStart,
  SavedObjectsServiceStart,
  Logger,
  Plugin,
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

  /*
   * In the future, OSS features should register their own subfeature
   * privileges. This can be done when parts of Reporting are moved to
   * src/plugins. For now, this method exists for `reporting` to tell
   * `features` to include Reporting when registering OSS features.
   */
  enableReportingUiCapabilities(): void;
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
export class FeaturesPlugin
  implements
    Plugin<RecursiveReadonly<PluginSetupContract>, RecursiveReadonly<PluginStartContract>> {
  private readonly logger: Logger;
  private readonly featureRegistry: FeatureRegistry = new FeatureRegistry();
  private isTimelionEnabled: boolean = false;
  private isReportingEnabled: boolean = false;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.logger = this.initializerContext.logger.get();
  }

  public setup(
    core: CoreSetup,
    { visTypeTimelion }: { visTypeTimelion?: TimelionSetupContract }
  ): RecursiveReadonly<PluginSetupContract> {
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
      enableReportingUiCapabilities: this.enableReportingUiCapabilities.bind(this),
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
      includeReporting: this.isReportingEnabled,
    });

    for (const feature of features) {
      this.featureRegistry.registerKibanaFeature(feature);
    }
  }

  private enableReportingUiCapabilities() {
    this.logger.debug(
      `Feature controls for Reporting plugin are enabled. Please assign access to Reporting use Kibana feature controls for applications.`
    );
    this.isReportingEnabled = true;
  }
}
