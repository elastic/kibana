/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


export const cloud = (kibana) => {
  return new kibana.Plugin({
    id: 'cloud',
    configPrefix: 'xpack.cloud',
    require: ['kibana', 'elasticsearch', 'xpack_main'],

    uiExports: {
      injectDefaultVars(server, options) {
        return {
          isCloudEnabled: !!options.id,
          cloudId: options.id,
        };
      }
    },

    config(Joi) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        id: Joi.string(),
      }).default();
    },
  });
};
