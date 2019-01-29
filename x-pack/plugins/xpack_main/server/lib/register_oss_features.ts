/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Feature } from './feature_registry';

const kibanaFeatures: Feature[] = [
  {
    id: 'discover',
    name: 'Discover',
    icon: 'discoverApp',
    navLinkId: 'kibana:discover',
    app: ['kibana'],
    catalogue: ['discover'],
    privileges: {
      all: {
        savedObject: {
          all: ['search'],
          read: ['config', 'index-pattern'],
        },
        ui: ['show', 'save'],
      },
      read: {
        savedObject: {
          all: [],
          read: ['config', 'index-pattern', 'search'],
        },
        ui: ['show'],
      },
    },
  },
  {
    id: 'visualize',
    name: 'Visualize',
    icon: 'visualizeApp',
    navLinkId: 'kibana:visualize',
    app: ['kibana'],
    catalogue: ['visualize'],
    privileges: {
      all: {
        savedObject: {
          all: ['visualization'],
          read: ['config', 'index-pattern', 'search'],
        },
        ui: [],
      },
      read: {
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
    navLinkId: 'kibana:dashboard',
    app: ['kibana'],
    catalogue: ['dashboard'],
    privileges: {
      all: {
        savedObject: {
          all: ['dashboard'],
          read: ['config', 'index-pattern', 'search', 'visualization', 'timelion', 'canvas'],
        },
        ui: ['createNew', 'show', 'showWriteControls'],
      },
      read: {
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
        ui: ['show'],
      },
    },
  },
  {
    id: 'dev_tools',
    name: 'Dev Tools',
    icon: 'devToolsApp',
    navLinkId: 'kibana:dev_tools',
    app: ['kibana'],
    catalogue: ['console', 'searchprofiler', 'grokdebugger'],
    privileges: {
      read: {
        api: ['console/execute'],
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
    icon: 'advancedSettingsApp',
    app: ['kibana'],
    catalogue: ['advanced_settings'],
    management: {
      kibana: ['settings'],
    },
    privileges: {
      all: {
        savedObject: {
          all: ['config'],
          read: [],
        },
        ui: [],
      },
    },
  },
  {
    id: 'indexPatterns',
    name: 'Index Pattern Management',
    icon: 'indexPatternApp',
    app: ['kibana'],
    catalogue: ['index_patterns'],
    management: {
      kibana: ['indices'],
    },
    privileges: {
      all: {
        savedObject: {
          all: ['index-pattern'],
          read: ['config'],
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
    navLinkId: 'timelion',
    app: ['timelion', 'kibana'],
    catalogue: ['timelion'],
    privileges: {
      all: {
        savedObject: {
          all: ['timelion'],
          read: ['config', 'index-pattern'],
        },
        ui: [],
      },
      read: {
        savedObject: {
          all: [],
          read: ['config', 'index-pattern', 'timelion'],
        },
        ui: [],
      },
    },
  },
];

export function registerOssFeatures(registerFeature: (feature: Feature) => void) {
  for (const feature of [...kibanaFeatures, ...timelionFeatures]) {
    registerFeature(feature);
  }
}
