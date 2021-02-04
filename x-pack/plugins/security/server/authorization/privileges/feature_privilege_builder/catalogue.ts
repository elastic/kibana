/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureKibanaPrivileges } from '../../../../../features/server';
import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';

export class FeaturePrivilegeCatalogueBuilder extends BaseFeaturePrivilegeBuilder {
  public getActions(privilegeDefinition: FeatureKibanaPrivileges): string[] {
    const catalogueEntries = privilegeDefinition.catalogue;

    if (!catalogueEntries) {
      return [];
    }

    return catalogueEntries.map((catalogueEntryId) =>
      this.actions.ui.get('catalogue', catalogueEntryId)
    );
  }
}
