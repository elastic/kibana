/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import mappings from './mappings.json';
import { init } from './server';

import { APP_ID } from './common/constants';

import { ActionService, ActionTypeService } from './server';

export interface ActionsPlugin {
  create: ActionService['create'];
  get: ActionService['get'];
  find: ActionService['find'];
  delete: ActionService['delete'];
  update: ActionService['update'];
  fire: ActionService['fire'];
  registerType: ActionTypeService['register'];
  listTypes: ActionTypeService['list'];
}

export function actions(kibana: any) {
  return new kibana.Plugin({
    id: APP_ID,
    configPrefix: 'xpack.actions',
    require: ['kibana', 'elasticsearch', 'encrypted_saved_objects'],
    config(Joi: any) {
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
