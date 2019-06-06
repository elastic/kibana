/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { resolve } from 'path';
import {
  CoreSetup,
  LegacyPluginInitializer,
  PluginInitializerContext,
  Server,
} from './common/types';
import { Plugin } from './server/plugin';
import { ID, REQUIRED_PLUGINS } from './common/constants';
import { mappings, savedObjectSchemas } from './server/saved_objects';

const ICON = 'merge';
const ROOT = `plugins/${ID}`;
const pluginTitle = i18n.translate('xpack.integrationsManager.pluginTitle', {
  defaultMessage: 'Integrations Manager',
});

export const integrationsManager: LegacyPluginInitializer = kibana => {
  return new kibana.Plugin({
    require: REQUIRED_PLUGINS,
    id: ID,
    configPrefix: 'xpack.integrationsManager',
    publicDir: resolve(__dirname, 'public'),

    uiExports: {
      app: {
        title: pluginTitle,
        description: pluginTitle,
        main: `${ROOT}/index`,
        euiIconType: ICON,
        order: 8100,
      },
      // This defines what shows up in the registry found at /app/kibana#/home and /app/kibana#/home/feature_directory
      home: [`${ROOT}/register_feature`],
      mappings,
      savedObjectSchemas,
    },

    init(server: Server) {
      server.plugins.xpack_main.registerFeature({
        id: ID,
        name: pluginTitle,
        icon: ICON,
        navLinkId: ID,
        app: [ID, 'kibana'],
        catalogue: [ID],
        privileges: {
          all: {
            api: [ID],
            catalogue: [ID],
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['show', 'save'],
          },
          read: {
            api: [ID],
            catalogue: [ID],
            savedObject: {
              all: [],
              read: [],
            },
            ui: ['show'],
          },
        },
      });

      // new Kibana platform shim starts here
      const coreSetup = {
        http: {
          route: server.route.bind(server),
        },
      } as CoreSetup;
      const initializerContext = {} as PluginInitializerContext;
      new Plugin(initializerContext).setup(coreSetup);
    },
  });
};
