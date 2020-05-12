/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from 'src/core/server';
import { PluginSetupContract as FeaturesPluginSetupContract } from '../../features/server';

import { APP_ID, APP_ICON, MAP_SAVED_OBJECT_TYPE } from '../common/constants';
import { mapSavedObjects, mapsTelemetrySavedObjects } from './saved_objects';

interface SetupDeps {
  features: FeaturesPluginSetupContract;
}

export class MapsPlugin implements Plugin {
  constructor(initializerContext: PluginInitializerContext) {}
  setup(core: CoreSetup, plugins: SetupDeps) {
    plugins.features.registerFeature({
      id: APP_ID,
      name: i18n.translate('xpack.maps.featureRegistry.mapsFeatureName', {
        defaultMessage: 'Maps',
      }),
      order: 600,
      icon: APP_ICON,
      navLinkId: APP_ID,
      app: [APP_ID, 'kibana'],
      catalogue: [APP_ID],
      privileges: {
        all: {
          app: [APP_ID, 'kibana'],
          catalogue: [APP_ID],
          savedObject: {
            all: [MAP_SAVED_OBJECT_TYPE, 'query'],
            read: ['index-pattern'],
          },
          ui: ['save', 'show', 'saveQuery'],
        },
        read: {
          app: [APP_ID, 'kibana'],
          catalogue: [APP_ID],
          savedObject: {
            all: [],
            read: [MAP_SAVED_OBJECT_TYPE, 'index-pattern', 'query'],
          },
          ui: ['show'],
        },
      },
    });

    core.savedObjects.registerType(mapsTelemetrySavedObjects);
    core.savedObjects.registerType(mapSavedObjects);
  }
  start(core: CoreStart) {}
}
