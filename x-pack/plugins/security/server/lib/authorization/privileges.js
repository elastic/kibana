/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IGNORED_TYPES } from '../../../common/constants';

export function buildPrivilegeMap(savedObjectTypes, actions) {

  const buildAccessFeatureAction = (feature) => `ui:${feature}/read`;

  const buildSavedObjectsActions = (types, savedObjectActions) => {
    return types
      .filter(type => !IGNORED_TYPES.includes(type))
      .map(type => savedObjectActions.map(savedObjectAction => actions.getSavedObjectAction(type, savedObjectAction)))
      .reduce((acc, types) => [...acc, ...types], []);
  };

  const buildSavedObjectsReadActions = (types) => buildSavedObjectsActions(types, ['get', 'bulk_get', 'find']);
  const buildSavedObjectsWriteActions = (types) => buildSavedObjectsActions(types, ['create', 'bulk_create', 'update', 'delete']);
  const buildAllSavedObjectsActions = (types) => [...buildSavedObjectsReadActions(types), ...buildSavedObjectsWriteActions(types)];

  // the following list of privileges should only be added to, you can safely remove actions, but not privileges as
  // it's a backwards compatibility issue and we'll have to at least adjust registerPrivilegesWithCluster to support it
  return {
    global: {
      all: [
        actions.version,
        'action:*',
        'ui:kibana*',
        'api:*',
      ],
      read: [
        actions.version,
        actions.login,
        'ui:*',
        'api:console/proxy/execute',
        ...buildSavedObjectsActions(savedObjectTypes, [
          'get',
          'bulk_get',
          'find'
        ])
      ],
    },
    features: {
      discover: {
        read_write: [
          buildAccessFeatureAction(`kibana`),
          buildAccessFeatureAction(`kibana:discover`),
          ...buildSavedObjectsReadActions(['index-pattern']),
          ...buildAllSavedObjectsActions(['search'])
        ],
        read: [
          buildAccessFeatureAction(`kibana`),
          buildAccessFeatureAction(`kibana:discover`),
          ...buildSavedObjectsReadActions(['index-pattern', 'search']),
        ],
        share: [
          'action:saved_objects/search/share',
        ]
      },
      visualize: {
        all: [
          buildAccessFeatureAction(`kibana`),
          buildAccessFeatureAction(`kibana:visualize`),
          ...buildSavedObjectsReadActions(['index-pattern', 'search']),
          ...buildAllSavedObjectsActions(['visualization'])
        ],
        read: [
          buildAccessFeatureAction(`kibana`),
          buildAccessFeatureAction(`kibana:visualize`),
          ...buildSavedObjectsReadActions(['index-pattern', 'search', 'visualization']),
        ]
      },
      dashboard: {
        all: [
          buildAccessFeatureAction(`kibana`),
          buildAccessFeatureAction(`kibana:dashboard`),
          ...buildSavedObjectsReadActions(['index-pattern', 'search', 'visualization', 'timelion', 'canvas']),
          ...buildAllSavedObjectsActions(['dashboard'])
        ],
        read: [
          buildAccessFeatureAction(`kibana`),
          buildAccessFeatureAction(`kibana:dashboard`),
          ...buildSavedObjectsReadActions(['index-pattern', 'search', 'visualization', 'timelion', 'canvas', 'dashboard']),
        ]
      },
      timelion: {
        all: [
          buildAccessFeatureAction(`timelion`),
          ...buildSavedObjectsReadActions(['index-pattern' ]),
          ...buildAllSavedObjectsActions(['timelion'])
        ],
        read: [
          buildAccessFeatureAction(`timelion`),
          ...buildSavedObjectsReadActions(['index-pattern', 'timelion']),
        ]
      },
      canvas: {
        all: [
          buildAccessFeatureAction(`canvas`),
          ...buildSavedObjectsReadActions(['index-pattern']),
          ...buildAllSavedObjectsActions(['canvas'])
        ],
        read: [
          buildAccessFeatureAction(`canvas`),
          ...buildSavedObjectsReadActions(['index-pattern', 'canvas']),
        ]
      },
      apm: {
        all: [
          buildAccessFeatureAction(`apm`),
        ]
      },
      ml: {
        all: [
          buildAccessFeatureAction(`ml`),
        ]
      },
      graph: {
        all: [
          buildAccessFeatureAction(`graph`),
          ...buildSavedObjectsReadActions(['index-pattern']),
          ...buildAllSavedObjectsActions(['graph'])
        ],
        read: [
          buildAccessFeatureAction(`graph`),
          ...buildSavedObjectsReadActions(['index-pattern', 'graph']),
        ]
      },
      devTools: {
        all: [
          buildAccessFeatureAction(`kibana`),
          buildAccessFeatureAction('kibana:dev_tools'),
          'api:console/proxy/execute'
        ],
      },
      monitoring: {
        all: [
          buildAccessFeatureAction(`monitoring`),
        ]
      },
      // This is a subfeature of a feature within an application
      // it feels strange to put the feature at the same level as a full-featured application
      advancedSettings: {
        all: [
          buildAccessFeatureAction(`kibana:management:advancedSettings`),
          ...buildAllSavedObjectsActions(['config'])
        ],
        read: [
          // not being able to write config makes some things hard:
          // automatic assignment of default index pattern
          buildAccessFeatureAction(`kibana:management:advancedSettings`),
          ...buildSavedObjectsReadActions(['config'])
        ]
      },
      management: {
        all: [
          buildAccessFeatureAction(`kibana`),
          buildAccessFeatureAction(`kibana:management`),
        ]
      },
    },
    space: {
      all: [
        actions.version,
        actions.login,
        'ui:*',
        'api:*',
        ...buildSavedObjectsActions(savedObjectTypes, [
          'create',
          'bulk_create',
          'delete',
          'get',
          'bulk_get',
          'find',
          'update'
        ])
      ],
      read: [
        actions.version,
        actions.login,
        'ui:*',
        'api:console/proxy/execute',
        ...buildSavedObjectsActions(savedObjectTypes, [
          'get',
          'bulk_get',
          'find'])
      ],
    },
  };
}
