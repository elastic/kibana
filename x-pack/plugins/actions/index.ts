/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Root } from 'joi';
import mappings from './mappings.json';
import { init } from './server';

export { ActionsPlugin, ActionsClient } from './server';

export function actions(kibana: any) {
  return new kibana.Plugin({
    id: 'actions',
    configPrefix: 'xpack.actions',
    require: ['kibana', 'elasticsearch', 'encrypted_saved_objects'],
    config(Joi: Root) {
      return Joi.object()
        .keys({
          enabled: Joi.boolean().default(true),
        })
        .default();
    },
    init,
    uiExports: {
      mappings,
    },
  });
}
