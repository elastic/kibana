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
    privileges: {
      all: {
        catalogue: ['discover'],
        app: ['kibana'],
        savedObject: {
          all: ['search'],
          read: ['config', 'index-pattern'],
        },
        ui: ['show', 'save'],
      },
      read: {
        catalogue: ['discover'],
        app: ['kibana'],
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
    privileges: {
      all: {
        catalogue: ['visualize'],
        app: ['kibana'],
        savedObject: {
          all: ['visualization'],
          read: ['config', 'index-pattern', 'search'],
        },
        ui: [],
      },
      read: {
        catalogue: ['visualize'],
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
    navLinkId: 'kibana:dashboard',
    privileges: {
      all: {
        catalogue: ['dashboard'],
        app: ['kibana'],
        savedObject: {
          all: ['dashboard'],
          read: ['config', 'index-pattern', 'search', 'visualization', 'timelion', 'canvas'],
        },
        ui: ['show', 'showWriteControls'],
      },
      read: {
        catalogue: ['dashboard'],
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
        ui: ['show'],
      },
    },
  },
  {
    id: 'dev_tools',
    name: 'Dev Tools',
    icon: 'devToolsApp',
    navLinkId: 'kibana:dev_tools',
    privileges: {
      all: {
        catalogue: ['console', 'searchprofiler', 'grokdebugger'],
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
    icon: 'advancedSettingsApp',
    privileges: {
      all: {
        catalogue: ['advanced_settings'],
        management: {
          kibana: ['settings'],
        },
        app: ['kibana'],
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
    privileges: {
      all: {
        catalogue: ['index_patterns'],
        management: {
          kibana: ['indices'],
        },
        app: ['kibana'],
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
    privileges: {
      all: {
        catalogue: ['timelion'],
        app: ['timelion', 'kibana'],
        savedObject: {
          all: ['timelion'],
          read: ['config', 'index-pattern'],
        },
        ui: [],
      },
      read: {
        catalogue: ['timelion'],
        app: ['timelion', 'kibana'],
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
