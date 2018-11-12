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
    icon: 'discoverApp',
    navlinkId: 'kibana:discover',
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
        ui: [],
      },
    },
  },
  {
    id: 'visualize',
    name: 'Visualize',
    icon: 'visualizeApp',
    navlinkId: 'kibana:visualize',
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
        ui: [],
      },
    },
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: 'dashboardApp',
    navlinkId: 'kibana:dashboard',
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
        ui: [],
      },
    },
  },
  {
    id: 'dev_tools',
    name: 'Dev Tools',
    icon: 'devToolsApp',
    navlinkId: 'kibana:dev_tools',
    privileges: {
      all: {
        api: ['console/execute'],
        app: ['kibana'],
        savedObject: {
          all: [],
          read: ['config'],
        },
        ui: [],
      },
    },
  },
  {
    id: 'advancedSettings',
    name: 'Advanced Settings',
    icon: 'managementApp',
    navlinkId: 'kibana:management:advancedSettings',
    privileges: {
      advancedSettings_all: {
        api: [],
        app: ['kibana'],
        savedObject: {
          all: ['config'],
          read: [],
        },
        ui: [],
      },
    },
  },
];

const timelionFeatures: Feature[] = [
  {
    id: 'timelion',
    name: 'Timelion',
    icon: 'timelionApp',
    navlinkId: 'timelion',
    privileges: {
      all: {
        app: ['timelion'],
        savedObject: {
          all: ['timelion'],
          read: ['config', 'index-pattern'],
        },
        ui: [],
      },
      read: {
        app: ['timelion'],
        savedObject: {
          all: [],
          read: ['config', 'index-pattern', 'timelion'],
        },
        ui: [],
      },
    },
  },
];

export function registerOssFeatures() {
  kibanaFeatures.forEach(registerFeature);
  timelionFeatures.forEach(registerFeature);
}
