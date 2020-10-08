/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SavedObjectsClientContract,
  SavedObject,
  SavedObjectsUpdateResponse,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
} from '../../../../../../../src/core/server';
import { ruleStatusSavedObjectType } from '../rules/saved_object_mappings';
import { IRuleStatusAttributes } from '../rules/types';

export interface RuleStatusSavedObjectsClient {
  find: (
    options?: Omit<SavedObjectsFindOptions, 'type'>
  ) => Promise<SavedObjectsFindResponse<IRuleStatusAttributes>>;
  create: (attributes: IRuleStatusAttributes) => Promise<SavedObject<IRuleStatusAttributes>>;
  update: (
    id: string,
    attributes: Partial<IRuleStatusAttributes>
  ) => Promise<SavedObjectsUpdateResponse<IRuleStatusAttributes>>;
  delete: (id: string) => Promise<{}>;
}

export const ruleStatusSavedObjectsClientFactory = (
  savedObjectsClient: SavedObjectsClientContract
): RuleStatusSavedObjectsClient => ({
  find: (options) =>
    savedObjectsClient.find<IRuleStatusAttributes>({ ...options, type: ruleStatusSavedObjectType }),
  create: (attributes) => savedObjectsClient.create(ruleStatusSavedObjectType, attributes),
  update: (id, attributes) => savedObjectsClient.update(ruleStatusSavedObjectType, id, attributes),
  delete: (id) => savedObjectsClient.delete(ruleStatusSavedObjectType, id),
});
