/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/server';
import { PluginSetupContract as FeaturesPluginSetupContract } from '../../features/server';

interface SetupDeps {
  features: FeaturesPluginSetupContract;
}

export class MapsPlugin implements Plugin {
  constructor(initializerContext: PluginInitializerContext) {}
  setup(core: CoreSetup, plugins: SetupDeps) {
    plugins.features.registerFeature({
      id: 'maps',
      name: i18n.translate('xpack.maps.featureRegistry.mapsFeatureName', {
        defaultMessage: 'Maps',
      }),
      order: 600,
      icon: 'gisApp',
      navLinkId: 'maps',
      app: ['maps', 'kibana'],
      catalogue: ['maps'],
      privileges: {
        all: {
          app: ['maps', 'kibana'],
          catalogue: ['maps'],
          savedObject: {
            all: ['map', 'query'],
            read: ['index-pattern'],
          },
          ui: ['save', 'show', 'saveQuery'],
        },
        read: {
          app: ['maps', 'kibana'],
          catalogue: ['maps'],
          savedObject: {
            all: [],
            read: ['map', 'index-pattern', 'query'],
          },
          ui: ['show'],
        },
      },
    });
  }
  start(core: CoreStart) {}
}
