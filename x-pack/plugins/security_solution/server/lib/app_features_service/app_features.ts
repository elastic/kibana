/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  AppFeatureKey,
  AppFeaturesConfig,
  AppSubFeaturesMap,
  BaseKibanaFeatureConfig,
} from '@kbn/security-solution-features';
import { AppFeaturesConfigMerger } from './app_features_config_merger';

export class AppFeatures<T extends string = string, S extends string = string> {
  private featureConfigMerger: AppFeaturesConfigMerger;
  private appFeatures?: Set<AppFeatureKey>;
  private featuresSetup?: FeaturesPluginSetup;

  constructor(
    private readonly logger: Logger,
    subFeaturesMap: AppSubFeaturesMap<S>,
    private readonly baseKibanaFeature: BaseKibanaFeatureConfig,
    private readonly baseKibanaSubFeatureIds: T[]
  ) {
    this.featureConfigMerger = new AppFeaturesConfigMerger(this.logger, subFeaturesMap);
  }

  public init(featuresSetup: FeaturesPluginSetup) {
    this.featuresSetup = featuresSetup;
  }

  public setConfig(config: AppFeaturesConfig<S>) {
    if (this.appFeatures) {
      throw new Error('AppFeatures has already been registered');
    }
    this.registerEnabledKibanaFeatures(config);
  }

  private registerEnabledKibanaFeatures(appFeatureConfig: AppFeaturesConfig) {
    if (this.featuresSetup == null) {
      throw new Error(
        'Cannot sync kibana features as featuresSetup is not present. Did you call init?'
      );
    }

    const completeAppFeatureConfig = this.featureConfigMerger.mergeAppFeatureConfigs(
      this.baseKibanaFeature,
      this.baseKibanaSubFeatureIds,
      Array.from(appFeatureConfig.values())
    );

    this.logger.debug(JSON.stringify(completeAppFeatureConfig));

    this.featuresSetup.registerKibanaFeature(completeAppFeatureConfig);
  }
}
