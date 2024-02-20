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
import type { ProductFeatureKeyType } from '@kbn/security-solution-features';
import {
  getAssistantFeature,
  getCasesFeature,
  getSecurityFeature,
} from '@kbn/security-solution-features/product_features';
import type { ExperimentalFeatures } from '../../../common';
import { APP_ID } from '../../../common';
import { ProductFeatures } from './product_features';
import type { ProductFeaturesConfigurator } from './types';
import { securityDefaultSavedObjects } from './security_saved_objects';
import { casesApiTags, casesUiCapabilities } from './cases_privileges';

export class ProductFeaturesService {
  private securityProductFeatures: ProductFeatures;
  private casesProductFeatures: ProductFeatures;
  private securityAssistantProductFeatures: ProductFeatures;
  private productFeatures?: Set<ProductFeatureKeyType>;

  constructor(
    private readonly logger: Logger,
    private readonly experimentalFeatures: ExperimentalFeatures
  ) {
    const securityFeature = getSecurityFeature({
      savedObjects: securityDefaultSavedObjects,
      experimentalFeatures: this.experimentalFeatures,
    });
    this.securityProductFeatures = new ProductFeatures(
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
    this.casesProductFeatures = new ProductFeatures(
      this.logger,
      casesFeature.subFeaturesMap,
      casesFeature.baseKibanaFeature,
      casesFeature.baseKibanaSubFeatureIds
    );

    const assistantFeature = getAssistantFeature();
    this.securityAssistantProductFeatures = new ProductFeatures(
      this.logger,
      assistantFeature.subFeaturesMap,
      assistantFeature.baseKibanaFeature,
      assistantFeature.baseKibanaSubFeatureIds
    );
  }

  public init(featuresSetup: FeaturesPluginSetup) {
    this.securityProductFeatures.init(featuresSetup);
    this.casesProductFeatures.init(featuresSetup);
    this.securityAssistantProductFeatures.init(featuresSetup);
  }

  public setProductFeaturesConfigurator(configurator: ProductFeaturesConfigurator) {
    const securityProductFeaturesConfig = configurator.security();
    this.securityProductFeatures.setConfig(securityProductFeaturesConfig);

    const casesProductFeaturesConfig = configurator.cases();
    this.casesProductFeatures.setConfig(casesProductFeaturesConfig);

    const securityAssistantProductFeaturesConfig = configurator.securityAssistant();
    this.securityAssistantProductFeatures.setConfig(securityAssistantProductFeaturesConfig);

    this.productFeatures = new Set<ProductFeatureKeyType>(
      Object.freeze([
        ...securityProductFeaturesConfig.keys(),
        ...casesProductFeaturesConfig.keys(),
        ...securityAssistantProductFeaturesConfig.keys(),
      ]) as readonly ProductFeatureKeyType[]
    );
  }

  public isEnabled(productFeatureKey: ProductFeatureKeyType): boolean {
    if (!this.productFeatures) {
      throw new Error('ProductFeatures has not yet been configured');
    }
    return this.productFeatures.has(productFeatureKey);
  }

  public getApiActionName = (apiPrivilege: string) => `api:${APP_ID}-${apiPrivilege}`;

  public isActionRegistered(action: string) {
    return (
      this.securityProductFeatures.isActionRegistered(action) ||
      this.casesProductFeatures.isActionRegistered(action) ||
      this.securityAssistantProductFeatures.isActionRegistered(action)
    );
  }

  public isApiPrivilegeEnabled(apiPrivilege: string) {
    return this.isActionRegistered(this.getApiActionName(apiPrivilege));
  }

  public registerApiAccessControl(http: HttpServiceSetup) {
    // The `securitySolutionProductFeature:` prefix is used for ProductFeature based control.
    // Should be used only by routes that do not need RBAC, only direct productFeature control.
    const APP_FEATURE_TAG_PREFIX = 'securitySolutionProductFeature:';
    // The "access:securitySolution-" prefix is used for API action based control.
    // Should be used by routes that need RBAC, extending the `access:` role privilege check from the security plugin.
    // An additional check is performed to ensure the privilege has been registered by the productFeature service,
    // preventing full access (`*`) roles, such as superuser, from bypassing productFeature controls.
    const API_ACTION_TAG_PREFIX = `access:${APP_ID}-`;

    http.registerOnPostAuth((request, response, toolkit) => {
      for (const tag of request.route.options.tags) {
        let isEnabled = true;
        if (tag.startsWith(APP_FEATURE_TAG_PREFIX)) {
          isEnabled = this.isEnabled(
            tag.substring(APP_FEATURE_TAG_PREFIX.length) as ProductFeatureKeyType
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
