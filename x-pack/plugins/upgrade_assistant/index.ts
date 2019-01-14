/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Server } from 'hapi';
import Joi from 'joi';
import { resolve } from 'path';
import { initServer } from './server';

export function upgradeAssistant(kibana: any) {
  return new kibana.Plugin({
    id: 'upgrade_assistant',
    require: ['elasticsearch'],
    uiExports: {
      managementSections: ['plugins/upgrade_assistant'],
      styleSheetPaths: resolve(__dirname, 'public/index.scss'),
      mappings: require('./mappings.json'),
      savedObjectSchemas: {
        'upgrade-assistant-reindex-operation': {
          isNamespaceAgnostic: true,
        },
      },
    },
    publicDir: resolve(__dirname, 'public'),

    config() {
      return Joi.object({
        enabled: Joi.boolean().default(true),
      }).default();
    },

    init(server: Server) {
      // Add server routes and initialize the plugin here
      initServer(server);
    },
  });
}
