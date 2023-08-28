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
import { hiddenTypes as filesSavedObjectTypes } from '@kbn/files-plugin/server/saved_objects';
import type { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { AppFeatureKey } from '@kbn/security-solution-features';
import {
  getSecurityFeature,
  getCasesFeature,
  getAssistantFeature,
} from '@kbn/security-solution-features/app_features';
import type { ExperimentalFeatures } from '../../../common';
import { AppFeatures } from './app_features';
import type { AppFeaturesConfigurator } from './types';
import { securityDefaultSavedObjects } from './security_saved_objects';
import { casesUiCapabilities, casesApiTags } from './cases_privileges';

export class AppFeaturesService {
  private securityAppFeatures: AppFeatures;
  private casesAppFeatures: AppFeatures;
  private securityAssistantAppFeatures: AppFeatures;
  private appFeatures?: Set<AppFeatureKey>;

  constructor(
    private readonly logger: Logger,
    private readonly experimentalFeatures: ExperimentalFeatures
  ) {
    const securityFeature = getSecurityFeature({
      savedObjects: securityDefaultSavedObjects,
      experimentalFeatures: this.experimentalFeatures,
    });
    this.securityAppFeatures = new AppFeatures(
      this.logger,
      securityFeature.subFeaturesMap,
      securityFeature.baseKibanaFeature,
      securityFeature.baseKibanaSubFeatureIds
    );

    const casesFeature = getCasesFeature({
      uiCapabilities: casesUiCapabilities,
      apiTags: casesApiTags,
      savedObjects: { files: filesSavedObjectTypes },
    });
    this.casesAppFeatures = new AppFeatures(
      this.logger,
      casesFeature.subFeaturesMap,
      casesFeature.baseKibanaFeature,
      casesFeature.baseKibanaSubFeatureIds
    );

    const assistantFeature = getAssistantFeature();
    this.securityAssistantAppFeatures = new AppFeatures(
      this.logger,
      assistantFeature.subFeaturesMap,
      assistantFeature.baseKibanaFeature,
      assistantFeature.baseKibanaSubFeatureIds
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
