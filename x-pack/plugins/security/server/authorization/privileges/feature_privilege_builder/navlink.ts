/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature, FeatureKibanaPrivileges } from '../../../../../features/server';
import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';

export class FeaturePrivilegeNavlinkBuilder extends BaseFeaturePrivilegeBuilder {
  public getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: Feature): string[] {
    const appNavLinks = feature.app.map((app) => this.actions.ui.get('navLinks', app));
    return feature.navLinkId
      ? [this.actions.ui.get('navLinks', feature.navLinkId), ...appNavLinks]
      : appNavLinks;
  }
}
