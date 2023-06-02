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
  getSecurityBaseKibanaSubFeatureIds,
} from './security_kibana_features';
import {
  getCasesBaseKibanaFeature,
  getCasesAppFeaturesConfig,
  getCasesBaseKibanaSubFeatureIds,
} from './security_cases_kibana_features';
import { AppFeaturesConfigMerger } from './app_features_config_merger';
import { casesSubFeaturesMap } from './security_cases_kibana_sub_features';
import { securitySubFeaturesMap } from './security_kibana_sub_features';

type AppFeaturesMap = Map<AppFeatureKey, boolean>;

export class AppFeatures {
  private securityFeatureConfigMerger: AppFeaturesConfigMerger;
  private casesFeatureConfigMerger: AppFeaturesConfigMerger;
  private appFeatures?: AppFeaturesMap;
  private featuresSetup?: FeaturesPluginSetup;

  constructor(
    private readonly logger: Logger,
    private readonly experimentalFeatures: ExperimentalFeatures
  ) {
    this.securityFeatureConfigMerger = new AppFeaturesConfigMerger(
      this.logger,
      securitySubFeaturesMap
    );
    this.casesFeatureConfigMerger = new AppFeaturesConfigMerger(this.logger, casesSubFeaturesMap);
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
    const securityBaseKibanaFeature = getSecurityBaseKibanaFeature();
    const securityBaseKibanaSubFeatureIds = getSecurityBaseKibanaSubFeatureIds(
      this.experimentalFeatures
    );
    const enabledSecurityAppFeaturesConfigs = this.getEnabledAppFeaturesConfigs(
      getSecurityAppFeaturesConfig()
    );
    this.featuresSetup.registerKibanaFeature(
      this.securityFeatureConfigMerger.mergeAppFeatureConfigs(
        securityBaseKibanaFeature,
        securityBaseKibanaSubFeatureIds,
        enabledSecurityAppFeaturesConfigs
      )
    );

    // register security cases Kibana features
    const securityCasesBaseKibanaFeature = getCasesBaseKibanaFeature();
    const securityCasesBaseKibanaSubFeatureIds = getCasesBaseKibanaSubFeatureIds();
    const enabledCasesAppFeaturesConfigs = this.getEnabledAppFeaturesConfigs(
      getCasesAppFeaturesConfig()
    );
    this.featuresSetup.registerKibanaFeature(
      this.casesFeatureConfigMerger.mergeAppFeatureConfigs(
        securityCasesBaseKibanaFeature,
        securityCasesBaseKibanaSubFeatureIds,
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
