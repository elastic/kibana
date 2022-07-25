/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FeatureKibanaPrivileges } from '@kbn/features-plugin/server';

import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';

export class FeaturePrivilegeManagementBuilder extends BaseFeaturePrivilegeBuilder {
  public getActions(privilegeDefinition: FeatureKibanaPrivileges): string[] {
    const managementSections = privilegeDefinition.management;

    if (!managementSections) {
      return [];
    }

    return Object.entries(managementSections).reduce((acc, [sectionId, items]) => {
      return [...acc, ...items.map((item) => this.actions.ui.get('management', sectionId, item))];
    }, [] as string[]);
  }
}
