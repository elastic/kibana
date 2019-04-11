/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Root } from 'joi';
import { Legacy, Server } from 'kibana';

// @ts-ignore
import { AuditLogger } from '../../server/lib/audit_logger';

import { CONFIG_PREFIX, PLUGIN_ID, Plugin } from './server/plugin';

export const encryptedSavedObjects = (kibana: any) =>
  new kibana.Plugin({
    id: PLUGIN_ID,
    configPrefix: CONFIG_PREFIX,
    require: ['kibana', 'elasticsearch', 'xpack_main'],

    config(Joi: Root) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        encryptionKey: Joi.string().min(32),
        audit: Joi.object({ enabled: Joi.boolean().default(false) }),
      }).default();
    },

    async init(server: Legacy.Server) {
      const loggerFacade = {
        fatal: (errorOrMessage: string | Error) => server.log(['fatal', PLUGIN_ID], errorOrMessage),
        trace: (message: string) => server.log(['debug', PLUGIN_ID], message),
        error: (message: string) => server.log(['error', PLUGIN_ID], message),
        warn: (message: string) => server.log(['warning', PLUGIN_ID], message),
        debug: (message: string) => server.log(['debug', PLUGIN_ID], message),
        info: (message: string) => server.log(['info', PLUGIN_ID], message),
      } as Server.Logger;

      const config = server.config();
      const encryptedSavedObjectsSetup = new Plugin(loggerFacade).setup(
        {
          config: {
            auditLogEnabled: config.get<boolean>(`${CONFIG_PREFIX}.audit.enabled`),
            encryptionKey: config.get<string>(`${CONFIG_PREFIX}.encryptionKey`),
          },
          savedObjects: server.savedObjects,
          elasticsearch: server.plugins.elasticsearch,
        },
        { audit: new AuditLogger(server, PLUGIN_ID) }
      );

      // Re-expose plugin setup contract through legacy mechanism.
      for (const [setupMethodName, setupMethod] of Object.entries(encryptedSavedObjectsSetup)) {
        server.expose(setupMethodName, setupMethod);
      }
    },
  });
