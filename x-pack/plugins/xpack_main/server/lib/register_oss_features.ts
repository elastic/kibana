/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { Feature } from './feature_registry';

const kibanaFeatures: Feature[] = [
  {
    id: 'discover',
    name: i18n.translate('xpack.xpack_main.featureRegistry.discoverFeatureName', {
      defaultMessage: 'Discover',
    }),
    icon: 'discoverApp',
    navLinkId: 'kibana:discover',
    catalogue: ['discover'],
    privileges: {
      all: {
        app: ['kibana'],
        savedObject: {
          all: ['search'],
          read: ['config', 'index-pattern'],
        },
        ui: ['show', 'save'],
      },
      read: {
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
    name: i18n.translate('xpack.xpack_main.featureRegistry.visualizeFeatureName', {
      defaultMessage: 'Visualize',
    }),
    icon: 'visualizeApp',
    navLinkId: 'kibana:visualize',
    catalogue: ['visualize'],
    privileges: {
      all: {
        app: ['kibana'],
        savedObject: {
          all: ['visualization'],
          read: ['config', 'index-pattern', 'search'],
        },
        ui: [],
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
    name: i18n.translate('xpack.xpack_main.featureRegistry.dashboardFeatureName', {
      defaultMessage: 'Dashboard',
    }),
    icon: 'dashboardApp',
    navLinkId: 'kibana:dashboard',
    catalogue: ['dashboard'],
    privileges: {
      all: {
        app: ['kibana'],
        savedObject: {
          all: ['dashboard'],
          read: [
            'config',
            'index-pattern',
            'search',
            'visualization',
            'timelion-sheet',
            'canvas-workpad',
          ],
        },
        ui: ['createNew', 'show', 'showWriteControls'],
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
            'timelion-sheet',
            'canvas-workpad',
            'dashboard',
          ],
        },
        ui: ['show'],
      },
    },
  },
  {
    id: 'dev_tools',
    name: i18n.translate('xpack.xpack_main.featureRegistry.devToolsFeatureName', {
      defaultMessage: 'Dev Tools',
    }),
    icon: 'devToolsApp',
    navLinkId: 'kibana:dev_tools',
    catalogue: ['console', 'searchprofiler', 'grokdebugger'],
    privileges: {
      read: {
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
    name: i18n.translate('xpack.xpack_main.featureRegistry.advancedSettingsFeatureName', {
      defaultMessage: 'Advanced Settings',
    }),
    icon: 'advancedSettingsApp',
    catalogue: ['advanced_settings'],
    management: {
      kibana: ['settings'],
    },
    privileges: {
      all: {
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
    name: i18n.translate('xpack.xpack_main.featureRegistry.indexPatternFeatureName', {
      defaultMessage: 'Index Pattern Management',
    }),
    icon: 'indexPatternApp',
    catalogue: ['index_patterns'],
    management: {
      kibana: ['indices'],
    },
    privileges: {
      all: {
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
    catalogue: ['timelion'],
    privileges: {
      all: {
        app: ['timelion', 'kibana'],
        savedObject: {
          all: ['timelion-sheet'],
          read: ['config', 'index-pattern'],
        },
        ui: [],
      },
      read: {
        app: ['timelion', 'kibana'],
        savedObject: {
          all: [],
          read: ['config', 'index-pattern', 'timelion-sheet'],
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
