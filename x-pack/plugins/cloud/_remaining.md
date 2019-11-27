/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { registerCloudUsageCollector } from './cloud_usage_collector';

export const cloud = kibana => {
  return new kibana.Plugin({
    id: 'cloud',
    configPrefix: 'xpack.cloud',
    require: ['kibana', 'elasticsearch', 'xpack_main'],

    uiExports: {
      injectDefaultVars(server, options) {
        return {
          isCloudEnabled: !!options.id,
          cloudId: options.id
        };
      },
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        id: Joi.string(),
        apm: Joi.object({
          url: Joi.string(),
          secret_token: Joi.string(),
          ui: Joi.object({
            url: Joi.string(),
          }).default(),
        }).default(),
      }).default();
    },

    init(server) {
      const config = server.config().get(`xpack.cloud`);
      server.expose('config', {
        isCloudEnabled: !!config.id
      });
      const { usageCollection } = server.newPlatform.setup.plugins;
      registerCloudUsageCollector(usageCollection, server);
    }
  });
};
