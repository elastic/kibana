/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IGNORED_TYPES } from '../../../common/constants';

interface PrivilegeMap {
  global: Record<string, string[]>;
  features: Record<string, Record<string, string[]>>;
  space: Record<string, string[]>;
}

export function buildPrivilegeMap(allSavedObjectTypes: string[], actions: any): PrivilegeMap {
  const validSavedObjectTypes = allSavedObjectTypes.filter(type => !IGNORED_TYPES.includes(type));

  // the following list of privileges should only be added to, you can safely remove actions, but not privileges as
  // it's a backwards compatibility issue and we'll have to at least adjust registerPrivilegesWithCluster to support it
  return {
    features: {
      discover: {
        read_write: [
          actions.ui.get('kibana'),
          actions.ui.get('kibana:discover'),
          ...actions.savedObject.readOperations('index-pattern'),
          ...actions.savedObject.allOperations('search'),
        ],
        read: [
          actions.ui.get('kibana'),
          actions.ui.get('kibana:discover'),
          ...actions.savedObject.readOperations(['index-pattern', 'search']),
        ],
        share: [actions.savedObject.get('search', 'share')],
      },
      visualize: {
        all: [
          ...actions.savedObject.allOperations('visualization'),
          ...actions.savedObject.readOperations(['index-pattern', 'search']),
          actions.ui.get('kibana'),
          actions.ui.get('kibana:visualize'),
        ],
        read: [
          ...actions.savedObject.readOperations(['index-pattern', 'search', 'visualization']),
          actions.ui.get('kibana'),
          actions.ui.get('kibana:visualize'),
        ],
      },
      dashboard: {
        all: [
          actions.ui.get(`kibana`),
          actions.ui.get(`kibana:dashboard`),
          ...actions.savedObject.readOperations([
            'index-pattern',
            'search',
            'visualization',
            'timelion',
            'canvas',
          ]),
          ...actions.savedObject.allOperations(['dashboard']),
        ],
        read: [
          actions.ui.get(`kibana`),
          actions.ui.get(`kibana:dashboard`),
          ...actions.savedObject.readOperations([
            'index-pattern',
            'search',
            'visualization',
            'timelion',
            'canvas',
            'dashboard',
          ]),
        ],
      },
      timelion: {
        all: [
          actions.ui.get(`timelion`),
          ...actions.savedObject.readOperations(['index-pattern']),
          ...actions.savedObject.allOperations(['timelion']),
        ],
        read: [
          actions.ui.get(`timelion`),
          ...actions.savedObject.readOperations(['index-pattern', 'timelion']),
        ],
      },
      canvas: {
        all: [
          actions.ui.get(`canvas`),
          ...actions.savedObject.readOperations(['index-pattern']),
          ...actions.savedObject.allOperations(['canvas']),
        ],
        read: [
          actions.ui.get(`canvas`),
          ...actions.savedObject.readOperations(['index-pattern', 'canvas']),
        ],
      },
      apm: {
        all: [actions.ui.get(`apm`)],
      },
      ml: {
        all: [actions.ui.get(`ml`)],
      },
      graph: {
        all: [
          actions.ui.get(`graph`),
          ...actions.savedObject.readOperations(['index-pattern']),
          ...actions.savedObject.allOperations(['graph']),
        ],
        read: [
          actions.ui.get(`graph`),
          ...actions.savedObject.readOperations(['index-pattern', 'graph']),
        ],
      },
      devTools: {
        all: [
          actions.ui.get(`kibana`),
          actions.ui.get('kibana:dev_tools'),
          'api:console/proxy/execute',
        ],
      },
      monitoring: {
        all: [actions.ui.get(`monitoring`)],
      },
      // This is a subfeature of a feature within an application
      // it feels strange to put the feature at the same level as a full-featured application
      advancedSettings: {
        all: [
          actions.ui.get(`kibana:management:advancedSettings`),
          ...actions.savedObject.allOperations(['config']),
        ],
        read: [
          // not being able to write config makes some things hard:
          // automatic assignment of default index pattern
          actions.ui.get(`kibana:management:advancedSettings`),
          ...actions.savedObject.readOperations(['config']),
        ],
      },
      management: {
        all: [actions.ui.get(`kibana`), actions.ui.get(`kibana:management`)],
      },
    },
    global: {
      all: [
        actions.api.all,
        actions.login,
        actions.savedObject.all,
        actions.space.manage,
        actions.ui.all,
        actions.version,
      ],
      read: [
        actions.api.get('console/proxy/execute'),
        actions.login,
        ...actions.savedObject.readOperations(validSavedObjectTypes),
        actions.ui.all,
        actions.version,
      ],
    },
    space: {
      all: [
        actions.api.all,
        actions.login,
        ...actions.savedObject.allOperations(validSavedObjectTypes),
        actions.ui.all,
        actions.version,
      ],
      read: [
        actions.api.get('console/proxy/execute'),
        actions.login,
        ...actions.savedObject.readOperations(validSavedObjectTypes),
        actions.ui.get('*'),
        actions.version,
      ],
    },
  };
}
