/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Actions } from '../../actions';
import { FeaturePrivilegeApiBuilder } from './api';
import { FeaturePrivilegeAppBuilder } from './app';
import { FeaturePrivilegeCatalogueBuilder } from './catalogue';
import { FeaturePrivilegeManagementBuilder } from './management';
import { FeaturePrivilegeNavlinkBuilder } from './navlink';
import { FeaturePrivilegeSavedObjectBuilder } from './saved_object';
import { FeaturePrivilegeSavedObjectsManagementBuilder } from './saved_objects_management';
import { FeaturePrivilegeUIBuilder } from './ui';
export { FeaturePrivilegeBuilder } from './feature_privilege_builder';

export const featurePrivilegeBuildersFactory = (actions: Actions): FeaturePrivilegeApiBuilder[] => {
  return [
    new FeaturePrivilegeApiBuilder(actions),
    new FeaturePrivilegeAppBuilder(actions),
    new FeaturePrivilegeCatalogueBuilder(actions),
    new FeaturePrivilegeManagementBuilder(actions),
    new FeaturePrivilegeNavlinkBuilder(actions),
    new FeaturePrivilegeSavedObjectBuilder(actions),
    new FeaturePrivilegeSavedObjectsManagementBuilder(actions),
    new FeaturePrivilegeUIBuilder(actions),
  ];
};
