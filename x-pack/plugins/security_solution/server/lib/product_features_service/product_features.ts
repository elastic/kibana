/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type {
  ProductFeatureKeyType,
  ProductFeaturesConfig,
  AppSubFeaturesMap,
  BaseKibanaFeatureConfig,
} from '@kbn/security-solution-features';
import { ProductFeaturesConfigMerger } from './product_features_config_merger';

export class ProductFeatures<T extends string = string, S extends string = string> {
  private featureConfigMerger: ProductFeaturesConfigMerger;
  private productFeatures?: Set<ProductFeatureKeyType>;
  private featuresSetup?: FeaturesPluginSetup;

  constructor(
    private readonly logger: Logger,
    subFeaturesMap: AppSubFeaturesMap<S>,
    private readonly baseKibanaFeature: BaseKibanaFeatureConfig,
    private readonly baseKibanaSubFeatureIds: T[]
  ) {
    this.featureConfigMerger = new ProductFeaturesConfigMerger(this.logger, subFeaturesMap);
  }

  public init(featuresSetup: FeaturesPluginSetup) {
    this.featuresSetup = featuresSetup;
  }

  public setConfig(config: ProductFeaturesConfig<S>) {
    if (this.productFeatures) {
      throw new Error('ProductFeatures has already been registered');
    }
    this.registerEnabledKibanaFeatures(config);
  }

  private registerEnabledKibanaFeatures(productFeatureConfig: ProductFeaturesConfig) {
    if (this.featuresSetup == null) {
      throw new Error(
        'Cannot sync kibana features as featuresSetup is not present. Did you call init?'
      );
    }

    const completeProductFeatureConfig = this.featureConfigMerger.mergeProductFeatureConfigs(
      this.baseKibanaFeature,
      this.baseKibanaSubFeatureIds,
      Array.from(productFeatureConfig.values())
    );

    this.logger.debug(JSON.stringify(completeProductFeatureConfig));

    this.featuresSetup.registerKibanaFeature(completeProductFeatureConfig);
  }
}
