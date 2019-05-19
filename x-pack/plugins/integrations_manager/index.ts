/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { Server } from 'hapi';
import { resolve } from 'path';
import { CoreSetup, PluginInitializerContext } from 'src/core/server/index.js';
import { LegacyPluginInitializer } from 'src/legacy/types';
import { plugin } from './server';

const ID = 'integrations_manager';
const ICON = 'merge';
const pluginTitle = i18n.translate('xpack.integrations_manager.pluginTitle', {
  defaultMessage: 'Integrations Manager',
});

export const integrationsManager: LegacyPluginInitializer = kibana => {
  return new kibana.Plugin({
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    id: ID,
    configPrefix: 'xpack.integrations_manager',
    publicDir: resolve(__dirname, 'public'),

    uiExports: {
      app: {
        title: pluginTitle,
        description: pluginTitle,
        main: 'plugins/integrations_manager/index',
        euiIconType: ICON,
        order: 8100,
      },
      // This defines what shows up in the registry found at /app/kibana#/home and /app/kibana#/home/feature_directory
      home: ['plugins/integrations_manager/register_feature'],
    },

    init(server: Server) {
      server.plugins.xpack_main.registerFeature({
        id: ID,
        name: pluginTitle,
        icon: ICON,
        navLinkId: pluginTitle,
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
      const initializerContext = {} as PluginInitializerContext;
      const core = {
        http: {
          server,
        },
      } as CoreSetup;
      plugin(initializerContext).setup(core);
    },
  });
};
