/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { flatten } from 'lodash';
import { IGNORED_TYPES } from '../../../common/constants';

interface PrivilegeMap {
  global: Record<string, string[]>;
  features: Record<string, Record<string, string[]>>;
  space: Record<string, string[]>;
}

interface ActionDefinition {
  api: string[];
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

export function buildPrivilegeMap(allSavedObjectTypes: string[], actions: any): PrivilegeMap {
  const validSavedObjectTypes = allSavedObjectTypes.filter(type => !IGNORED_TYPES.includes(type));

  const buildActions = (actionDefinition: ActionDefinition) => {
    return [
      actions.login,
      actions.version,
      ...actionDefinition.api.map(api => actions.api.get(api)),
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

  // the following list of privileges should only be added to, you can safely remove actions, but not privileges as
  // it's a backwards compatibility issue and we'll have to at least adjust registerPrivilegesWithCluster to support it
  return {
    features: {
      discover: {
        all: buildActions({
          api: [],
          app: ['kibana'],
          savedObject: {
            all: ['search'],
            read: ['config', 'index-pattern'],
          },
          ui: ['kibana:discover'],
        }),
        read: buildActions({
          api: [],
          app: ['kibana'],
          savedObject: {
            all: [],
            read: ['config', 'index-pattern', 'search'],
          },
          ui: ['kibana:discover'],
        }),
      },
      visualize: {
        all: buildActions({
          api: [],
          app: ['kibana'],
          savedObject: {
            all: ['visualization'],
            read: ['config', 'index-pattern', 'search'],
          },
          ui: ['kibana_visualize'],
        }),
        read: buildActions({
          api: [],
          app: ['kibana'],
          savedObject: {
            all: [],
            read: ['config', 'index-pattern', 'search', 'visualization'],
          },
          ui: ['kibana:visualize'],
        }),
      },
      dashboard: {
        all: buildActions({
          api: [],
          app: ['kibana'],
          savedObject: {
            all: ['dashboard'],
            read: ['config', 'index-pattern', 'search', 'visualization', 'timelion', 'canvas'],
          },
          ui: ['kibana:dashboard'],
        }),
        read: buildActions({
          api: [],
          app: ['kibana'],
          savedObject: {
            all: [],
            read: [
              'config',
              'index-pattern',
              'search',
              'visualization',
              'timelion',
              'canvas',
              'dashboard',
            ],
          },
          ui: ['kibana:dashboard'],
        }),
      },
      timelion: {
        all: buildActions({
          api: [],
          app: ['timelion'],
          savedObject: {
            all: ['timelion'],
            read: ['config', 'index-pattern'],
          },
          ui: ['timelion'],
        }),
        read: buildActions({
          api: [],
          app: ['timelion'],
          savedObject: {
            all: [],
            read: ['config', 'index-pattern', 'timelion'],
          },
          ui: ['timelion'],
        }),
      },
      canvas: {
        all: buildActions({
          api: [],
          app: ['canvas'],
          savedObject: {
            all: ['canvas'],
            read: ['config', 'index-pattern'],
          },
          ui: ['canvas'],
        }),
        read: buildActions({
          api: [],
          app: ['canvas'],
          savedObject: {
            all: [],
            read: ['config', 'index-pattern', 'canvas'],
          },
          ui: ['canvas'],
        }),
      },
      apm: {
        all: buildActions({
          api: [],
          app: ['apm'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['apm'],
        }),
      },
      ml: {
        all: buildActions({
          api: [],
          app: ['ml'],
          savedObject: {
            all: [],
            read: [],
          },
          ui: ['ml'],
        }),
      },
      graph: {
        all: buildActions({
          api: [],
          app: ['graph'],
          savedObject: {
            all: [],
            read: ['config', 'index-pattern'],
          },
          ui: ['graph'],
        }),
        read: buildActions({
          api: [],
          app: ['graph'],
          savedObject: {
            all: [],
            read: ['config', 'index-pattern', 'graph'],
          },
          ui: [],
        }),
      },
      devTools: {
        all: buildActions({
          api: ['console/proxy/execute'],
          app: ['kibana'],
          savedObject: {
            all: [],
            read: ['config'],
          },
          ui: ['kibana:dev_tools'],
        }),
      },
      monitoring: {
        all: buildActions({
          api: [],
          app: ['monitoring'],
          savedObject: {
            all: [],
            read: ['config'],
          },
          ui: ['monitoring'],
        }),
      },
      // This is a subfeature of a feature within an application
      // it feels strange to put the feature at the same level as a full-featured application
      advancedSettings: {
        all: buildActions({
          api: [],
          app: ['kibana'],
          savedObject: {
            all: ['config'],
            read: [],
          },
          ui: ['kibana:management:advancedSettings'],
        }),
        read: buildActions({
          api: [],
          app: ['kibana'],
          savedObject: {
            all: [],
            read: ['config'],
          },
          ui: ['kibana:management:advancedSettings'],
        }),
      },
    },
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
        actions.api.get('console/proxy/execute'),
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
        actions.api.get('console/proxy/execute'),
        ...actions.savedObject.readOperations(validSavedObjectTypes),
        actions.ui.get('*'),
      ],
    },
  };
}
