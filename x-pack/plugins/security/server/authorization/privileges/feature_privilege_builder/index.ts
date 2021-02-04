/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatten } from 'lodash';
import { KibanaFeature, FeatureKibanaPrivileges } from '../../../../../features/server';
import { Actions } from '../../actions';
import { FeaturePrivilegeApiBuilder } from './api';
import { FeaturePrivilegeAppBuilder } from './app';
import { FeaturePrivilegeCatalogueBuilder } from './catalogue';
import { FeaturePrivilegeBuilder } from './feature_privilege_builder';
import { FeaturePrivilegeManagementBuilder } from './management';
import { FeaturePrivilegeNavlinkBuilder } from './navlink';
import { FeaturePrivilegeSavedObjectBuilder } from './saved_object';
import { FeaturePrivilegeAlertingBuilder } from './alerting';
import { FeaturePrivilegeUIBuilder } from './ui';
export { FeaturePrivilegeBuilder };

export const featurePrivilegeBuilderFactory = (actions: Actions): FeaturePrivilegeBuilder => {
  const builders = [
    new FeaturePrivilegeApiBuilder(actions),
    new FeaturePrivilegeAppBuilder(actions),
    new FeaturePrivilegeCatalogueBuilder(actions),
    new FeaturePrivilegeManagementBuilder(actions),
    new FeaturePrivilegeNavlinkBuilder(actions),
    new FeaturePrivilegeSavedObjectBuilder(actions),
    new FeaturePrivilegeUIBuilder(actions),
    new FeaturePrivilegeAlertingBuilder(actions),
  ];

  return {
    getActions(privilege: FeatureKibanaPrivileges, feature: KibanaFeature) {
      return flatten(builders.map((builder) => builder.getActions(privilege, feature)));
    },
  };
};
