/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature } from '../../../../xpack_main/types';
import { areActionsFullyCovered } from '../../../common/privilege_calculator_utils';
import { Actions } from './actions';
import { featurePrivilegeBuilderFactory } from './privileges/feature_privilege_builder';

const areActionsMorePermissive = (actionSet1: string[], actionSet2: string[]) => {
  return (
    areActionsFullyCovered(actionSet1, actionSet2) &&
    !areActionsFullyCovered(actionSet2, actionSet1)
  );
};

export function validateFeaturePrivileges(actions: Actions, features: Feature[]) {
  const featurePrivilegeBuilder = featurePrivilegeBuilderFactory(actions);
  for (const feature of features) {
    if (feature.privileges.all != null && feature.privileges.read != null) {
      const allActions = featurePrivilegeBuilder.getActions(feature.privileges.all, feature);
      const readActions = featurePrivilegeBuilder.getActions(feature.privileges.read, feature);
      if (!areActionsMorePermissive(allActions, readActions)) {
        throw new Error(
          `${
            feature.id
          }'s "all" privilege should grant additional actions compared to the "read" privilege.`
        );
      }
    }
  }
}
