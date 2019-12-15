/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature, FeatureKibanaPrivileges } from '../../../../../features/server';
import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';

export class FeaturePrivilegeManagementBuilder extends BaseFeaturePrivilegeBuilder {
  public getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: Feature): string[] {
    const managementSections = privilegeDefinition.management || feature.management;

    if (!managementSections) {
      return [];
    }

    return Object.entries(managementSections).reduce((acc, [sectionId, items]) => {
      return [...acc, ...items.map(item => this.actions.ui.get('management', sectionId, item))];
    }, [] as string[]);
  }
}
