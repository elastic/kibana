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
    name: i18n.translate('xpack.main.featureRegistry.discoverFeatureName', {
      defaultMessage: 'Discover',
    }),
    icon: 'discoverApp',
    navLinkId: 'kibana:discover',
    app: ['kibana'],
    catalogue: ['discover'],
    privileges: {
      all: {
        savedObject: {
          all: ['search', 'url'],
          read: ['config', 'index-pattern'],
        },
        ui: ['show', 'createShortUrl', 'save'],
      },
      read: {
        savedObject: {
          all: [],
          read: ['config', 'index-pattern', 'search', 'url'],
        },
        ui: ['show'],
      },
    },
  },
  {
    id: 'visualize',
    name: i18n.translate('xpack.main.featureRegistry.visualizeFeatureName', {
      defaultMessage: 'Visualize',
    }),
    icon: 'visualizeApp',
    navLinkId: 'kibana:visualize',
    app: ['kibana'],
    catalogue: ['visualize'],
    privileges: {
      all: {
        savedObject: {
          all: ['visualization', 'url'],
          read: ['config', 'index-pattern', 'search'],
        },
        ui: ['show', 'createShortUrl', 'delete', 'save'],
      },
      read: {
        savedObject: {
          all: [],
          read: ['config', 'index-pattern', 'search', 'visualization'],
        },
        ui: ['show'],
      },
    },
  },
  {
    id: 'dashboard',
    name: i18n.translate('xpack.main.featureRegistry.dashboardFeatureName', {
      defaultMessage: 'Dashboard',
    }),
    icon: 'dashboardApp',
    navLinkId: 'kibana:dashboard',
    app: ['kibana'],
    catalogue: ['dashboard'],
    privileges: {
      all: {
        savedObject: {
          all: ['dashboard', 'url'],
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
    name: i18n.translate('xpack.main.featureRegistry.devToolsFeatureName', {
      defaultMessage: 'Dev Tools',
    }),
    icon: 'devToolsApp',
    navLinkId: 'kibana:dev_tools',
    app: ['kibana'],
    catalogue: ['console', 'searchprofiler', 'grokdebugger'],
    privileges: {
      all: {
        api: ['console'],
        savedObject: {
          all: [],
          read: ['config'],
        },
        ui: ['show'],
      },
      read: {
        api: ['console'],
        savedObject: {
          all: [],
          read: ['config'],
        },
        ui: ['show'],
      },
    },
    privilegesTooltip: i18n.translate('xpack.main.featureRegistry.devToolsPrivilegesTooltip', {
      defaultMessage:
        'User should also be granted the appropriate Elasticsearch cluster and index privileges',
    }),
  },
  {
    id: 'advancedSettings',
    name: i18n.translate('xpack.main.featureRegistry.advancedSettingsFeatureName', {
      defaultMessage: 'Advanced Settings',
    }),
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
        ui: ['save'],
      },
      read: {
        savedObject: {
          all: [],
          read: ['config'],
        },
        ui: [],
      },
    },
  },
  {
    id: 'indexPatterns',
    name: i18n.translate('xpack.main.featureRegistry.indexPatternFeatureName', {
      defaultMessage: 'Index Pattern Management',
    }),
    icon: 'indexPatternApp',
    app: ['kibana'],
    catalogue: ['index_patterns'],
    management: {
      kibana: ['index_patterns'],
    },
    privileges: {
      all: {
        savedObject: {
          all: ['index-pattern'],
          read: ['config'],
        },
        ui: ['createNew'],
      },
      read: {
        savedObject: {
          all: [],
          read: ['index-pattern', 'config'],
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
          all: ['timelion-sheet'],
          read: ['config', 'index-pattern'],
        },
        ui: ['save'],
      },
      read: {
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
