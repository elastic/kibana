/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { mirrorPluginStatus } from '../../server/lib/mirror_plugin_status';
import { chatOpSettings } from './lib/chat_op_settings';
import { chatbot } from './bot';
import { resolve } from 'path';
import mappings from './mappings.json';

export const chatops = (kibana) => {
  return new kibana.Plugin({
    id: 'chatops',
    configPrefix: 'xpack.chatops',
    require: ['kibana', 'elasticsearch', 'xpack_main'],
    publicDir: resolve(__dirname, 'public'),
    config: async function (Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        chattoken: Joi.string().default('test'),
        chatname: Joi.string().default('test'),
        userid: Joi.string().default('test'),
        userpwd: Joi.string().default('test'),
      }).default();
    },
    uiExports: {
      hacks: [],
      mappings,
      savedObjectSchemas: {
        chatop: {
          isNamespaceAgnostic: true,
        },
      },
    },
    init: function (server) {
      const thisPlugin = this;
      const xpackMainPlugin = server.plugins.xpack_main;
      mirrorPluginStatus(xpackMainPlugin, thisPlugin);
      xpackMainPlugin.status.once('green', () => {
        xpackMainPlugin.info.feature(thisPlugin.id).registerLicenseCheckResultsGenerator(chatOpSettings);
      });
      chatbot(server);
    }
  });
};
