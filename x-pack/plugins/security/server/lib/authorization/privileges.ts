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
          actions.login,
          ...actions.savedObject.readOperations(['config', 'index-pattern']),
          ...actions.savedObject.allOperations('search'),
          actions.ui.get('kibana'),
          actions.ui.get('kibana:discover'),
          actions.version,
        ],
        read: [
          actions.login,
          ...actions.savedObject.readOperations(['config', 'index-pattern', 'search']),
          actions.ui.get('kibana'),
          actions.ui.get('kibana:discover'),
          actions.version,
        ],
        share: [actions.savedObject.get('search', 'share')],
      },
      visualize: {
        all: [
          actions.login,
          ...actions.savedObject.allOperations('visualization'),
          ...actions.savedObject.readOperations(['config', 'index-pattern', 'search']),
          actions.ui.get('kibana'),
          actions.ui.get('kibana:visualize'),
          actions.version,
        ],
        read: [
          actions.login,
          ...actions.savedObject.readOperations([
            'config',
            'index-pattern',
            'search',
            'visualization',
          ]),
          actions.ui.get('kibana'),
          actions.ui.get('kibana:visualize'),
          actions.version,
        ],
      },
      dashboard: {
        all: [
          actions.login,
          ...actions.savedObject.allOperations(['dashboard']),
          ...actions.savedObject.readOperations([
            'config',
            'index-pattern',
            'search',
            'visualization',
            'timelion',
            'canvas',
          ]),
          actions.ui.get(`kibana`),
          actions.ui.get(`kibana:dashboard`),
          actions.version,
        ],
        read: [
          actions.login,
          ...actions.savedObject.readOperations([
            'config',
            'index-pattern',
            'search',
            'visualization',
            'timelion',
            'canvas',
            'dashboard',
          ]),
          actions.ui.get(`kibana`),
          actions.ui.get(`kibana:dashboard`),
          actions.version,
        ],
      },
      timelion: {
        all: [
          actions.login,
          ...actions.savedObject.readOperations(['config', 'index-pattern']),
          ...actions.savedObject.allOperations(['timelion']),
          actions.ui.get(`timelion`),
          actions.version,
        ],
        read: [
          actions.login,
          ...actions.savedObject.readOperations(['config', 'index-pattern', 'timelion']),
          actions.ui.get(`timelion`),
          actions.version,
        ],
      },
      canvas: {
        all: [
          actions.login,
          ...actions.savedObject.readOperations(['index-pattern']),
          ...actions.savedObject.allOperations(['canvas']),
          actions.ui.get(`canvas`),
          actions.version,
        ],
        read: [
          actions.login,
          ...actions.savedObject.readOperations(['index-pattern', 'canvas']),
          actions.ui.get(`canvas`),
          actions.version,
        ],
      },
      apm: {
        all: [actions.login, actions.ui.get(`apm`), actions.version],
      },
      ml: {
        all: [actions.login, actions.ui.get(`ml`), actions.version],
      },
      graph: {
        all: [
          actions.login,
          ...actions.savedObject.readOperations(['index-pattern']),
          ...actions.savedObject.allOperations(['graph']),
          actions.ui.get(`graph`),
          actions.version,
        ],
        read: [
          actions.login,
          ...actions.savedObject.readOperations(['index-pattern', 'graph']),
          actions.ui.get(`graph`),
          actions.version,
        ],
      },
      devTools: {
        all: [
          actions.api.get('console/proxy/execute'),
          actions.login,
          actions.savedObject.readOperations('config'),
          actions.ui.get(`kibana`),
          actions.ui.get('kibana:dev_tools'),
          actions.version,
        ],
      },
      monitoring: {
        all: [
          actions.login,
          actions.savedObject.readOperations('config'),
          actions.ui.get(`monitoring`),
          actions.version,
        ],
      },
      // This is a subfeature of a feature within an application
      // it feels strange to put the feature at the same level as a full-featured application
      advancedSettings: {
        all: [
          actions.login,
          ...actions.savedObject.allOperations(['config']),
          actions.ui.get(`kibana:management:advancedSettings`),
          actions.version,
        ],
        read: [
          actions.login,
          // not being able to write config makes some things hard:
          // automatic assignment of default index pattern
          ...actions.savedObject.readOperations(['config']),
          actions.ui.get(`kibana:management:advancedSettings`),
          actions.version,
        ],
      },
      management: {
        all: [
          actions.login,
          actions.ui.get(`kibana`),
          actions.ui.get(`kibana:management`),
          actions.version,
        ],
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
