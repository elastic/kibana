/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten, mapValues } from 'lodash';
import { Feature } from '../../../../xpack_main/types';
import { IGNORED_TYPES } from '../../../common/constants';

interface PrivilegeMap {
  global: Record<string, string[]>;
  features: Record<string, Record<string, string[]>>;
  space: Record<string, string[]>;
}

interface ActionDefinition {
  api?: string[];
  app: string[];
  savedObject: {
    all: string[];
    read: string[];
  };
  space?: {
    manage: boolean;
  };
  ui: string[];
}

export function buildPrivilegeMap(
  allSavedObjectTypes: string[],
  actions: any,
  features: Feature[]
): PrivilegeMap {
  const validSavedObjectTypes = allSavedObjectTypes.filter(type => !IGNORED_TYPES.includes(type));

  const buildActions = (actionDefinition: ActionDefinition) => {
    return [
      actions.login,
      actions.version,
      ...(actionDefinition.api ? actionDefinition.api.map(api => actions.api.get(api)) : []),
      ...actionDefinition.app.map(appId => actions.app.get(appId)),
      ...flatten(
        actionDefinition.savedObject.all.map(types => actions.savedObject.allOperations(types))
      ),
      ...flatten(
        actionDefinition.savedObject.read.map(types => actions.savedObject.readOperations(types))
      ),
      ...(actionDefinition.space && actionDefinition.space.manage ? actions.space.manage : []),
      ...actionDefinition.ui.map(ui => actions.ui.get(ui)),
    ];
  };

  const featurePrivileges = features
    .filter(feature => feature.privileges)
    .reduce((acc: Record<string, any>, feature) => {
      acc[feature.id] = mapValues(feature.privileges!, privilegeDefinition =>
        buildActions(privilegeDefinition)
      );
      return acc;
    }, {});

  // the following list of privileges should only be added to, you can safely remove actions, but not privileges as
  // it's a backwards compatibility issue and we'll have to at least adjust registerPrivilegesWithCluster to support it
  return {
    features: featurePrivileges,
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
