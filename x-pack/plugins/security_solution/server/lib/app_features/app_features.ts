/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  KibanaFeatureConfig,
  PluginSetupContract as FeaturesPluginSetup,
} from '@kbn/features-plugin/server';
import type { AppFeatureKey, AppFeatureKeys, ExperimentalFeatures } from '../../../common';
import type { AppFeatureKibanaConfig, AppFeaturesConfig } from './types';
import {
  getSecurityAppFeaturesConfig,
  getSecurityBaseKibanaFeature,
} from './security_kibana_features';
import {
  getCasesBaseKibanaFeature,
  getCasesAppFeaturesConfig,
} from './security_cases_kibana_features';
import { getMergedAppFeatureConfigs } from './app_features_config_merger';

type AppFeaturesMap = Map<AppFeatureKey, boolean>;

export class AppFeatures {
  private experimentalFeatures: ExperimentalFeatures;
  private appFeatures: AppFeaturesMap;
  private featuresSetup?: FeaturesPluginSetup;

  constructor(experimentalFeatures: ExperimentalFeatures) {
    this.experimentalFeatures = experimentalFeatures;
    // Set all feature keys to true by default
    this.appFeatures = new Map(
      Object.keys({
        ...getSecurityAppFeaturesConfig(this.experimentalFeatures),
        ...getCasesAppFeaturesConfig(),
      }).map((appFeatureKey) => [appFeatureKey as AppFeatureKey, true])
    );
  }

  public init(featuresSetup: FeaturesPluginSetup) {
    this.featuresSetup = featuresSetup;
    this.registerEnabledKibanaFeatures();
  }

  public set(appFeatureKeys: AppFeatureKeys) {
    this.appFeatures = new Map(Object.entries(appFeatureKeys) as Array<[AppFeatureKey, boolean]>);
    this.registerEnabledKibanaFeatures();
  }

  public isEnabled(appFeatureKey: AppFeatureKey): boolean {
    return this.appFeatures.get(appFeatureKey) ?? false;
  }

  private registerEnabledKibanaFeatures() {
    // register main security Kibana features
    const securityBaseKibanaFeature = getSecurityBaseKibanaFeature(this.experimentalFeatures);
    const enabledSecurityAppFeaturesConfigs = this.getEnabledAppFeaturesConfigs(
      getSecurityAppFeaturesConfig(this.experimentalFeatures)
    );
    this.registerKibanaFeatures(
      getMergedAppFeatureConfigs(securityBaseKibanaFeature, enabledSecurityAppFeaturesConfigs)
    );

    // register security cases Kibana features
    const securityCasesBaseKibanaFeature = getCasesBaseKibanaFeature();
    const enabledCasesAppFeaturesConfigs = this.getEnabledAppFeaturesConfigs(
      getCasesAppFeaturesConfig()
    );
    this.registerKibanaFeatures(
      getMergedAppFeatureConfigs(securityCasesBaseKibanaFeature, enabledCasesAppFeaturesConfigs)
    );
  }

  private getEnabledAppFeaturesConfigs(
    appFeaturesConfigs: AppFeaturesConfig
  ): AppFeatureKibanaConfig[] {
    return Object.entries(appFeaturesConfigs).reduce<AppFeatureKibanaConfig[]>(
      (acc, [appFeatureKey, appFeatureConfig]) => {
        if (this.isEnabled(appFeatureKey as AppFeatureKey)) {
          acc.push(appFeatureConfig);
        }
        return acc;
      },
      []
    );
  }

  private registerKibanaFeatures(kibanaFeatureConfig: KibanaFeatureConfig) {
    if (this.featuresSetup == null) {
      throw new Error(
        'Cannot sync kibana features as featuresSetup is not present. Did you call init?'
      );
    }
    this.featuresSetup.unregisterKibanaFeature(kibanaFeatureConfig.id);
    this.featuresSetup.registerKibanaFeature(kibanaFeatureConfig);
  }
}
