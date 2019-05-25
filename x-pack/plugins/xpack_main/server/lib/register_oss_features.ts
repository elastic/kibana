/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { Feature } from './feature_registry';

const buildKibanaFeatures = (savedObjectTypes: string[]) => {
  return [
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
            read: ['index-pattern'],
          },
          ui: ['show', 'createShortUrl', 'save'],
        },
        read: {
          savedObject: {
            all: [],
            read: ['index-pattern', 'search', 'url'],
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
            read: ['index-pattern', 'search'],
          },
          ui: ['show', 'createShortUrl', 'delete', 'save'],
        },
        read: {
          savedObject: {
            all: [],
            read: ['index-pattern', 'search', 'visualization'],
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
              'index-pattern',
              'search',
              'visualization',
              'timelion-sheet',
              'canvas-workpad',
              'map',
            ],
          },
          ui: ['createNew', 'show', 'showWriteControls'],
        },
        read: {
          savedObject: {
            all: [],
            read: [
              'index-pattern',
              'search',
              'visualization',
              'timelion-sheet',
              'canvas-workpad',
              'map',
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
            read: [],
          },
          ui: ['show', 'save'],
        },
        read: {
          api: ['console'],
          savedObject: {
            all: [],
            read: [],
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
            read: [],
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
            read: [],
          },
          ui: ['save'],
        },
        read: {
          savedObject: {
            all: [],
            read: ['index-pattern'],
          },
          ui: [],
        },
      },
    },
    {
      id: 'savedObjectsManagement',
      name: i18n.translate('xpack.main.featureRegistry.savedObjectsManagementFeatureName', {
        defaultMessage: 'Saved Objects Management',
      }),
      icon: 'savedObjectsApp',
      app: ['kibana'],
      catalogue: ['saved_objects'],
      management: {
        kibana: ['objects'],
      },
      privileges: {
        all: {
          savedObject: {
            all: [...savedObjectTypes],
            read: [],
          },
          ui: [],
        },
        read: {
          savedObject: {
            all: [],
            read: [...savedObjectTypes],
          },
          ui: [],
        },
      },
    },
  ];
};

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
          read: ['index-pattern'],
        },
        ui: ['save'],
      },
      read: {
        savedObject: {
          all: [],
          read: ['index-pattern', 'timelion-sheet'],
        },
        ui: [],
      },
    },
  },
];

export function registerOssFeatures(
  registerFeature: (feature: Feature) => void,
  savedObjectTypes: string[]
) {
  const kibanaFeatures = buildKibanaFeatures(savedObjectTypes);
  for (const feature of [...kibanaFeatures, ...timelionFeatures]) {
    registerFeature(feature);
  }
}
