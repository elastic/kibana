/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FeatureKibanaPrivileges } from '../../../../../features/server';
import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';

export class FeaturePrivilegeAppBuilder extends BaseFeaturePrivilegeBuilder {
  public getActions(privilegeDefinition: FeatureKibanaPrivileges): string[] {
    const appIds = privilegeDefinition.app;

    if (!appIds) {
      return [];
    }

    return appIds.map((appId) => this.actions.app.get(appId));
  }
}
