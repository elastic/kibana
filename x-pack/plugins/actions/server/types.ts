/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClient } from 'src/legacy/server/saved_objects';
import { ActionsClient } from './actions_client';
import { ActionTypeService } from './action_type_service';

export type WithoutQueryAndParams<T> = Pick<T, Exclude<keyof T, 'query' | 'params'>>;

export interface SavedObjectReference {
  name: string;
  type: string;
  id: string;
}

export interface ActionsPlugin {
  registerType: ActionTypeService['register'];
  listTypes: ActionTypeService['list'];
  createActionsClient: (savedObjectsClient: SavedObjectsClient) => ActionsClient;
}
