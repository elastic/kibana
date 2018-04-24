/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export default function (kibana) {
  return new kibana.Plugin({
    configPrefix: 'xpack.cloud',

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
}
