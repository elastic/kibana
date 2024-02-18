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

  public getApiActionName = (apiPrivilege: string) => `api:${APP_ID}-${apiPrivilege}`;

  public isActionRegistered(action: string) {
    return (
      this.securityAppFeatures.isActionRegistered(action) ||
      this.casesAppFeatures.isActionRegistered(action) ||
      this.securityAssistantAppFeatures.isActionRegistered(action)
    );
  }

  public isApiPrivilegeEnabled(apiPrivilege: string) {
    return this.isActionRegistered(this.getApiActionName(apiPrivilege));
  }

  public registerApiAccessControl(http: HttpServiceSetup) {
    // The `securitySolutionAppFeature:` prefix is used for AppFeature based control.
    // Should be used only by routes that do not need RBAC, only direct appFeature control.
    const APP_FEATURE_TAG_PREFIX = 'securitySolutionAppFeature:';
    // The "access:securitySolution-" prefix is used for API action based control.
    // Should be used by routes that need RBAC, extending the `access:` role privilege check from the security plugin.
    // An additional check is performed to ensure the privilege has been registered by the appFeature service,
    // preventing full access (`*`) roles, such as superuser, from bypassing appFeature controls.
    const API_ACTION_TAG_PREFIX = `access:${APP_ID}-`;

    http.registerOnPostAuth((request, response, toolkit) => {
      for (const tag of request.route.options.tags) {
        let isEnabled = true;
        if (tag.startsWith(APP_FEATURE_TAG_PREFIX)) {
          isEnabled = this.isEnabled(
            tag.substring(APP_FEATURE_TAG_PREFIX.length) as AppFeatureKeyType
          );
        } else if (tag.startsWith(API_ACTION_TAG_PREFIX)) {
          isEnabled = this.isApiPrivilegeEnabled(tag.substring(API_ACTION_TAG_PREFIX.length));
        }

        if (!isEnabled) {
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
