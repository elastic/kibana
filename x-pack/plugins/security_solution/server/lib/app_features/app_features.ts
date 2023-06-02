/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
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
import { AppFeaturesConfigMerger } from './app_features_config_merger';

type AppFeaturesMap = Map<AppFeatureKey, boolean>;

export class AppFeatures {
  private merger: AppFeaturesConfigMerger;
  private appFeatures?: AppFeaturesMap;
  private featuresSetup?: FeaturesPluginSetup;

  constructor(
    private readonly logger: Logger,
    private readonly experimentalFeatures: ExperimentalFeatures
  ) {
    this.merger = new AppFeaturesConfigMerger(this.logger);
  }

  public init(featuresSetup: FeaturesPluginSetup) {
    this.featuresSetup = featuresSetup;
  }

  public set(appFeatureKeys: AppFeatureKeys) {
    if (this.appFeatures) {
      throw new Error('AppFeatures has already been initialized');
    }
    this.appFeatures = new Map(Object.entries(appFeatureKeys) as Array<[AppFeatureKey, boolean]>);
    this.registerEnabledKibanaFeatures();
  }

  public isEnabled(appFeatureKey: AppFeatureKey): boolean {
    if (!this.appFeatures) {
      throw new Error('AppFeatures has not been initialized');
    }
    return this.appFeatures.get(appFeatureKey) ?? false;
  }

  private registerEnabledKibanaFeatures() {
    if (this.featuresSetup == null) {
      throw new Error(
        'Cannot sync kibana features as featuresSetup is not present. Did you call init?'
      );
    }
    // register main security Kibana features
    const securityBaseKibanaFeature = getSecurityBaseKibanaFeature(this.experimentalFeatures);
    const enabledSecurityAppFeaturesConfigs = this.getEnabledAppFeaturesConfigs(
      getSecurityAppFeaturesConfig()
    );
    this.featuresSetup.registerKibanaFeature(
      this.merger.mergeAppFeatureConfigs(
        securityBaseKibanaFeature,
        enabledSecurityAppFeaturesConfigs
      )
    );

    // register security cases Kibana features
    const securityCasesBaseKibanaFeature = getCasesBaseKibanaFeature();
    const enabledCasesAppFeaturesConfigs = this.getEnabledAppFeaturesConfigs(
      getCasesAppFeaturesConfig()
    );
    this.featuresSetup.registerKibanaFeature(
      this.merger.mergeAppFeatureConfigs(
        securityCasesBaseKibanaFeature,
        enabledCasesAppFeaturesConfigs
      )
    );
  }

  private getEnabledAppFeaturesConfigs(
    appFeaturesConfigs: Partial<AppFeaturesConfig>
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
}
