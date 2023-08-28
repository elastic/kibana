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
import { assistantSubFeaturesMap } from './security_assistant_kibana_sub_features';
import {
  getAssistantAppFeaturesConfig,
  getAssistantBaseKibanaFeature,
  getAssistantBaseKibanaSubFeatureIds,
} from './security_assistant_kibana_features';

export class AppFeatures {
  private securityFeatureConfigMerger: AppFeaturesConfigMerger;
  private assistantFeatureConfigMerger: AppFeaturesConfigMerger;
  private casesFeatureConfigMerger: AppFeaturesConfigMerger;
  private appFeatures?: Set<AppFeatureKey>;
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
    this.assistantFeatureConfigMerger = new AppFeaturesConfigMerger(
      this.logger,
      assistantSubFeaturesMap
    );
  }

  public init(featuresSetup: FeaturesPluginSetup) {
    this.featuresSetup = featuresSetup;
  }

  public set(appFeatureKeys: AppFeatureKeys) {
    if (this.appFeatures) {
      throw new Error('AppFeatures has already been initialized');
    }
    this.appFeatures = new Set(appFeatureKeys);
    this.registerEnabledKibanaFeatures();
  }

  public isEnabled(appFeatureKey: AppFeatureKey): boolean {
    if (!this.appFeatures) {
      throw new Error('AppFeatures has not been initialized');
    }
    return this.appFeatures.has(appFeatureKey);
  }

  protected registerEnabledKibanaFeatures() {
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
      getSecurityAppFeaturesConfig(this.experimentalFeatures)
    );
    const completeAppFeatureConfig = this.securityFeatureConfigMerger.mergeAppFeatureConfigs(
      securityBaseKibanaFeature,
      securityBaseKibanaSubFeatureIds,
      enabledSecurityAppFeaturesConfigs
    );

    this.logger.debug(JSON.stringify(completeAppFeatureConfig));

    this.featuresSetup.registerKibanaFeature(completeAppFeatureConfig);

    // register security cases Kibana features
    const securityCasesBaseKibanaFeature = getCasesBaseKibanaFeature();
    const securityCasesBaseKibanaSubFeatureIds = getCasesBaseKibanaSubFeatureIds();
    const enabledCasesAppFeaturesConfigs = this.getEnabledAppFeaturesConfigs(
      getCasesAppFeaturesConfig()
    );
    const completeCasesAppFeatureConfig = this.casesFeatureConfigMerger.mergeAppFeatureConfigs(
      securityCasesBaseKibanaFeature,
      securityCasesBaseKibanaSubFeatureIds,
      enabledCasesAppFeaturesConfigs
    );

    this.logger.info(JSON.stringify(completeCasesAppFeatureConfig));

    this.featuresSetup.registerKibanaFeature(completeCasesAppFeatureConfig);

    // register security assistant Kibana features
    const securityAssistantBaseKibanaFeature = getAssistantBaseKibanaFeature();
    const securityAssistantBaseKibanaSubFeatureIds = getAssistantBaseKibanaSubFeatureIds();
    const enabledAssistantAppFeaturesConfigs = this.getEnabledAppFeaturesConfigs(
      getAssistantAppFeaturesConfig()
    );
    const completeAssistantAppFeatureConfig =
      this.assistantFeatureConfigMerger.mergeAppFeatureConfigs(
        securityAssistantBaseKibanaFeature,
        securityAssistantBaseKibanaSubFeatureIds,
        enabledAssistantAppFeaturesConfigs
      );

    this.logger.info(JSON.stringify(completeAssistantAppFeatureConfig));

    this.featuresSetup.registerKibanaFeature(completeAssistantAppFeatureConfig);
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
