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

import { cloneDeep, isArray, mergeWith, uniq } from 'lodash';
import type {
  KibanaFeatureConfig,
  PluginSetupContract as FeaturesPluginSetup,
} from '@kbn/features-plugin/server';
import type { AppFeatureKey, AppFeatureKeys, ExperimentalFeatures } from '../../../common';
import { DEFAULT_APP_FEATURES } from './default_app_features';
import type { AppFeatureKibanaConfig, AppFeaturesConfig } from './types';
import {
  getSecurityAppFeaturesConfig,
  getSecurityBaseKibanaFeature,
} from './security_kibana_features';
import {
  getCasesBaseKibanaFeature,
  getCasesAppFeaturesConfig,
} from './security_cases_kibana_features';

type AppFeaturesMap = Map<AppFeatureKey, boolean>;

export class AppFeatures {
  private experimentalFeatures: ExperimentalFeatures;
  private appFeatures: AppFeaturesMap;
  private featuresSetup?: FeaturesPluginSetup;

  constructor(experimentalFeatures: ExperimentalFeatures) {
    this.experimentalFeatures = experimentalFeatures;
    this.appFeatures = this.getAppFeaturesMapFromObject(DEFAULT_APP_FEATURES);
  }

  public init(featuresSetup: FeaturesPluginSetup) {
    this.featuresSetup = featuresSetup;
    this.registerKibanaFeatures();
  }

  public set(appFeatureKeys: AppFeatureKeys) {
    this.appFeatures = this.getAppFeaturesMapFromObject(appFeatureKeys);
    this.registerKibanaFeatures();
  }

  public isEnabled(appFeatureKey: AppFeatureKey): boolean {
    return this.appFeatures.get(appFeatureKey) ?? false;
  }

  private getAppFeaturesMapFromObject(appFeatureKeys: AppFeatureKeys): AppFeaturesMap {
    return new Map(Object.entries(appFeatureKeys) as Array<[AppFeatureKey, boolean]>);
  }

  private registerKibanaFeatures() {
    if (this.featuresSetup == null) {
      throw new Error(
        'Cannot sync kibana features as featuresSetup is not present. Did you call init?'
      );
    }
    // register main security Kibana features
    const securityBaseKibanaFeature = getSecurityBaseKibanaFeature(this.experimentalFeatures);
    this.featuresSetup.unregisterKibanaFeature(securityBaseKibanaFeature.id);
    this.featuresSetup.registerKibanaFeature(
      this.getMergedAppFeaturesConfigs(
        securityBaseKibanaFeature,
        getSecurityAppFeaturesConfig(this.experimentalFeatures)
      )
    );

    // register security cases Kibana features
    const securityCasesBaseKibanaFeature = getCasesBaseKibanaFeature();
    this.featuresSetup.unregisterKibanaFeature(securityCasesBaseKibanaFeature.id);
    this.featuresSetup.registerKibanaFeature(
      this.getMergedAppFeaturesConfigs(securityCasesBaseKibanaFeature, getCasesAppFeaturesConfig())
    );
  }

  private getMergedAppFeaturesConfigs(
    kibanaFeatureConfig: KibanaFeatureConfig,
    appFeaturesConfigs: AppFeaturesConfig
  ): KibanaFeatureConfig {
    const mergedKibanaConfig = cloneDeep(kibanaFeatureConfig);
    for (const [appFeatureKey, appFeatureConfig] of Object.entries(appFeaturesConfigs)) {
      if (this.isEnabled(appFeatureKey as AppFeatureKey)) {
        mergeFeatureConfig(mergedKibanaConfig, appFeatureConfig);
      }
    }
    return mergedKibanaConfig;
  }
}

// Merges the source appFeature config into the kibana feature config destination.
function mergeFeatureConfig(dest: KibanaFeatureConfig, source: AppFeatureKibanaConfig) {
  return mergeWith(dest, source, featureConfigMerger);
}

function featureConfigMerger(objValue: unknown, srcValue: unknown) {
  if (isArray(srcValue)) {
    if (isArray(objValue)) {
      // uniq is using the reference to compare subFeatures objects
      return uniq(objValue.concat(srcValue));
    }
    return srcValue;
  }
}
