/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, uniq } from 'lodash';
import {
  Feature,
  FeatureKibanaPrivileges,
} from '../../../../../../xpack_main/server/lib/feature_registry/feature_registry';
import { BaseFeaturePrivilegeBuilder } from './feature_privilege_builder';

export class FeaturePrivilegeSavedObjectsManagementBuilder extends BaseFeaturePrivilegeBuilder {
  public getActions(privilegeDefinition: FeatureKibanaPrivileges, feature: Feature): string[] {
    // TODO: Revisit if/when savedObjectsManagement UI Capabilities are refactored
    if (feature.id !== 'savedObjectsManagement') {
      return [];
    }
    return uniq([
      ...flatten(
        privilegeDefinition.savedObject.all.map(type => [
          this.actions.ui.get('savedObjectsManagement', type, 'delete'),
          this.actions.ui.get('savedObjectsManagement', type, 'edit'),
          this.actions.ui.get('savedObjectsManagement', type, 'read'),
        ])
      ),
      ...privilegeDefinition.savedObject.read.map(type =>
        this.actions.ui.get('savedObjectsManagement', type, 'read')
      ),
    ]);
  }
}
