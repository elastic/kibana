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

import type { HttpServiceSetup, Logger } from '@kbn/core/server';
import { hiddenTypes as filesSavedObjectTypes } from '@kbn/files-plugin/server/saved_objects';
import type { PluginSetupContract as FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { AppFeatureKeyType } from '@kbn/security-solution-features';
import {
  getAssistantFeature,
  getCasesFeature,
  getSecurityFeature,
} from '@kbn/security-solution-features/app_features';
import type { ExperimentalFeatures } from '../../../common';
import { APP_ID } from '../../../common';
import { AppFeatures } from './app_features';
import type { AppFeaturesConfigurator } from './types';
import { securityDefaultSavedObjects } from './security_saved_objects';
import { casesApiTags, casesUiCapabilities } from './cases_privileges';

export class AppFeaturesService {
  private securityAppFeatures: AppFeatures;
  private casesAppFeatures: AppFeatures;
  private securityAssistantAppFeatures: AppFeatures;
  private appFeatures?: Set<AppFeatureKeyType>;

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
    const securityAppFeaturesConfig = configurator.security();
    this.securityAppFeatures.setConfig(securityAppFeaturesConfig);

    const casesAppFeaturesConfig = configurator.cases();
    this.casesAppFeatures.setConfig(casesAppFeaturesConfig);

    const securityAssistantAppFeaturesConfig = configurator.securityAssistant();
    this.securityAssistantAppFeatures.setConfig(securityAssistantAppFeaturesConfig);

    this.appFeatures = new Set<AppFeatureKeyType>(
      Object.freeze([
        ...securityAppFeaturesConfig.keys(),
        ...casesAppFeaturesConfig.keys(),
        ...securityAssistantAppFeaturesConfig.keys(),
      ]) as readonly AppFeatureKeyType[]
    );
  }

  public isEnabled(appFeatureKey: AppFeatureKeyType): boolean {
    if (!this.appFeatures) {
      throw new Error('AppFeatures has not yet been configured');
    }
    return this.appFeatures.has(appFeatureKey);
  }

  public isApiPrivilegeEnabled(privilege: string) {
    const apiAction = `api:${APP_ID}-${privilege}`;
    return this.isActionRegistered(apiAction);
  }

  public isActionRegistered(action: string) {
    return (
      this.securityAppFeatures.isActionRegistered(action) ||
      this.casesAppFeatures.isActionRegistered(action) ||
      this.securityAssistantAppFeatures.isActionRegistered(action)
    );
  }

  public registerApiAuthorization(http: HttpServiceSetup) {
    const APP_FEATURE_TAG_PREFIX = 'appFeature:';
    const API_ACTION_TAG_PREFIX = `access:${APP_ID}-`; // take only "access:securitySolution-*" api actions

    http.registerOnPostAuth((request, response, toolkit) => {
      const tags = request.route.options.tags;
      const appFeatureTags = tags.filter((tag) => tag.startsWith(APP_FEATURE_TAG_PREFIX));
      const actionTags = tags.filter((tag) => tag.startsWith(API_ACTION_TAG_PREFIX));

      if (appFeatureTags.length > 0) {
        // App feature key based authorization.
        // This tag is used to check features that do not have RBAC privileges, only needs direct appFeature control.
        const disabled = appFeatureTags.some((tag) => {
          const appFeatureKey = tag.substring(APP_FEATURE_TAG_PREFIX.length) as AppFeatureKeyType;
          return !this.isEnabled(appFeatureKey);
        });
        if (disabled) {
          this.logger.warn(
            `Accessing disabled route "${request.url.pathname}${request.url.search}": responding with 404`
          );
          return response.notFound();
        }
      }

      if (actionTags.length > 0) {
        // Api action privilege based authorization. RBAC for this tag already done by security plugin.
        // This check ensures the api action privilege has been registered with the appFeatures service,
        // preventing full access (`*`) roles such as superuser to bypass RBAC controls for disabled appFeatures.
        const disabled = actionTags.some(
          (tag) => !this.isApiPrivilegeEnabled(tag.substring(API_ACTION_TAG_PREFIX.length))
        );
        if (disabled) {
          this.logger.warn(
            `Accessing disabled route "${request.url.pathname}${request.url.search}": responding with 404`
          );
          return response.notFound();
        }
      }

      return toolkit.next();
    });
  }
}
