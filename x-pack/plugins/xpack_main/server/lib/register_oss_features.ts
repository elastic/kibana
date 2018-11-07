/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature, registerFeature } from './feature_registry';

const kibanaFeatures: Feature[] = [
  {
    id: 'discover',
    name: 'Discover',
    type: 'app',
    icon: 'discoverApp',
    privileges: {
      all: {
        app: ['kibana'],
        savedObject: {
          all: ['search'],
          read: ['config', 'index-pattern'],
        },
        ui: ['kibana:discover'],
      },
      read: {
        app: ['kibana'],
        savedObject: {
          all: [],
          read: ['config', 'index-pattern', 'search'],
        },
        ui: ['kibana:discover'],
      },
    },
  },
  {
    id: 'visualize',
    name: 'Visualize',
    type: 'app',
    icon: 'visualizeApp',
    privileges: {
      all: {
        app: ['kibana'],
        savedObject: {
          all: ['visualization'],
          read: ['config', 'index-pattern', 'search'],
        },
        ui: ['kibana:visualize'],
      },
      read: {
        app: ['kibana'],
        savedObject: {
          all: [],
          read: ['config', 'index-pattern', 'search', 'visualization'],
        },
        ui: ['kibana:visualize'],
      },
    },
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    type: 'app',
    icon: 'dashboardApp',
    privileges: {
      all: {
        app: ['kibana'],
        savedObject: {
          all: ['dashboard'],
          read: ['config', 'index-pattern', 'search', 'visualization', 'timelion', 'canvas'],
        },
        ui: ['kibana:dashboard'],
      },
      read: {
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
      },
    },
  },
  {
    id: 'dev_tools',
    name: 'Dev Tools',
    type: 'app',
    icon: 'devToolsApp',
    privileges: {
      all: {
        api: ['console/execute'],
        app: ['kibana'],
        savedObject: {
          all: [],
          read: ['config'],
        },
        ui: ['kibana:dev_tools'],
      },
    },
  },
  {
    id: 'management',
    name: 'Management',
    type: 'app',
    icon: 'managementApp',
    privileges: {
      advancedSettings_all: {
        api: [],
        app: ['kibana'],
        savedObject: {
          all: [],
          read: ['config'],
        },
        ui: ['kibana:management:advancedSettings'],
      },
      advancedSettings_read: {
        api: [],
        app: ['kibana'],
        savedObject: {
          all: ['config'],
          read: [],
        },
        ui: ['kibana:management:advancedSettings'],
      },
    },
  },
];

const timelionFeatures: Feature[] = [
  {
    id: 'timelion',
    name: 'Timelion',
    type: 'app',
    icon: 'timelionApp',
    privileges: {
      all: {
        app: ['timelion'],
        savedObject: {
          all: ['timelion'],
          read: ['config', 'index-pattern'],
        },
        ui: ['timelion'],
      },
      read: {
        app: ['timelion'],
        savedObject: {
          all: [],
          read: ['config', 'index-pattern', 'timelion'],
        },
        ui: ['timelion'],
      },
    },
  },
];

export function registerOssFeatures() {
  kibanaFeatures.forEach(registerFeature);
  timelionFeatures.forEach(registerFeature);
}
