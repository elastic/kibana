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

import type { Logger } from '@kbn/core/server';
import type { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import { AppFeatures } from '@kbn/security-solution-features';
import type { AppFeatureKey, ExperimentalFeatures } from '../../../common';
import type { AppFeaturesConfigurator } from './types';
import {
  getSecurityBaseKibanaFeature,
  getSecurityBaseKibanaSubFeatureIds,
} from './security_kibana_features';
import {
  getCasesBaseKibanaFeature,
  getCasesBaseKibanaSubFeatureIds,
} from './security_cases_kibana_features';
import { casesSubFeaturesMap } from './security_cases_kibana_sub_features';
import { securitySubFeaturesMap } from './security_kibana_sub_features';
import {
  getAssistantBaseKibanaFeature,
  getAssistantBaseKibanaSubFeatureIds,
} from './security_assistant_kibana_features';
import { assistantSubFeaturesMap } from './security_assistant_kibana_sub_features';

export class AppFeaturesService {
  private securityAppFeatures: AppFeatures;
  private casesAppFeatures: AppFeatures;
  private securityAssistantAppFeatures: AppFeatures;
  private appFeatures?: Set<AppFeatureKey>;

  constructor(
    private readonly logger: Logger,
    private readonly experimentalFeatures: ExperimentalFeatures
  ) {
    const securityBaseKibanaFeature = getSecurityBaseKibanaFeature();
    const securityBaseKibanaSubFeatureIds = getSecurityBaseKibanaSubFeatureIds(
      this.experimentalFeatures
    );
    this.securityAppFeatures = new AppFeatures(
      this.logger,
      securitySubFeaturesMap,
      securityBaseKibanaFeature,
      securityBaseKibanaSubFeatureIds
    );

    const securityCasesBaseKibanaFeature = getCasesBaseKibanaFeature();
    const securityCasesBaseKibanaSubFeatureIds = getCasesBaseKibanaSubFeatureIds();
    this.casesAppFeatures = new AppFeatures(
      this.logger,
      casesSubFeaturesMap,
      securityCasesBaseKibanaFeature,
      securityCasesBaseKibanaSubFeatureIds
    );

    // register security assistant Kibana features
    const securityAssistantBaseKibanaFeature = getAssistantBaseKibanaFeature();
    const securityAssistantBaseKibanaSubFeatureIds = getAssistantBaseKibanaSubFeatureIds();
    this.securityAssistantAppFeatures = new AppFeatures(
      this.logger,
      assistantSubFeaturesMap,
      securityAssistantBaseKibanaFeature,
      securityAssistantBaseKibanaSubFeatureIds
    );
  }

  public init(featuresSetup: FeaturesPluginSetup) {
    this.securityAppFeatures.init(featuresSetup);
    this.casesAppFeatures.init(featuresSetup);
    this.securityAssistantAppFeatures.init(featuresSetup);
  }

  public setAppFeaturesConfigurator(configurator: AppFeaturesConfigurator) {
    const securityAppFeaturesConfig = configurator.security(this.experimentalFeatures);
    this.securityAppFeatures.setConfig(securityAppFeaturesConfig);

    const casesAppFeaturesConfig = configurator.cases();
    this.casesAppFeatures.setConfig(casesAppFeaturesConfig);

    const securityAssistantAppFeaturesConfig = configurator.securityAssistant();
    this.securityAssistantAppFeatures.setConfig(securityAssistantAppFeaturesConfig);

    this.appFeatures = new Set<AppFeatureKey>(
      Object.freeze([
        ...securityAppFeaturesConfig.keys(),
        ...casesAppFeaturesConfig.keys(),
        ...securityAssistantAppFeaturesConfig.keys(),
      ]) as readonly AppFeatureKey[]
    );
  }

  public isEnabled(appFeatureKey: AppFeatureKey): boolean {
    if (!this.appFeatures) {
      throw new Error('AppFeatures has not yet been configured');
    }
    return this.appFeatures.has(appFeatureKey);
  }
}
