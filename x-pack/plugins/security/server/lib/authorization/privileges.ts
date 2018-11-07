/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature } from '../../../../xpack_main/types';
import { IGNORED_TYPES } from '../../../common/constants';
import { Actions } from './actions';
import { FeaturesPrivileges, FeaturesPrivilegesBuilder } from './features_privileges_builder';

interface PrivilegeMap {
  global: Record<string, string[]>;
  features: FeaturesPrivileges;
  space: Record<string, string[]>;
}

export function buildPrivilegeMap(
  allSavedObjectTypes: string[],
  actions: Actions,
  features: Feature[]
): PrivilegeMap {
  const validSavedObjectTypes = allSavedObjectTypes.filter(type => !IGNORED_TYPES.includes(type));
  const featuresPrivilegesBuilder = new FeaturesPrivilegesBuilder(actions);

  return {
    features: featuresPrivilegesBuilder.build(features),
    global: {
      all: [
        actions.login,
        actions.version,
        actions.api.all,
        actions.savedObject.all,
        actions.space.manage,
        actions.ui.all,
      ],
      read: [
        actions.login,
        actions.version,
        actions.api.get('console/execute'),
        ...actions.savedObject.readOperations(validSavedObjectTypes),
        actions.ui.all,
      ],
    },
    space: {
      all: [
        actions.login,
        actions.version,
        actions.api.all,
        ...actions.savedObject.allOperations(validSavedObjectTypes),
        actions.ui.all,
      ],
      read: [
        actions.login,
        actions.version,
        actions.api.get('console/execute'),
        ...actions.savedObject.readOperations(validSavedObjectTypes),
        actions.ui.get('*'),
      ],
    },
  };
}
