/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { ruleAssetSavedObjectType } from './rule_asset_saved_object_mappings';

const DEFAULT_PAGE_SIZE = 100;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface IRuleAssetSOAttributes extends Record<string, any> {
  rule_id: string | null | undefined;
  version: string | null | undefined;
  name: string | null | undefined;
}

export interface IRuleAssetSavedObject {
  type: string;
  id: string;
  attributes: IRuleAssetSOAttributes;
}

export interface RuleAssetSavedObjectsClient {
  find: (
    options?: Omit<SavedObjectsFindOptions, 'type'>
  ) => Promise<SavedObjectsFindResponse<IRuleAssetSavedObject>>;
  all: () => Promise<IRuleAssetSavedObject[]>;
}

export const ruleAssetSavedObjectsClientFactory = (
  savedObjectsClient: SavedObjectsClientContract
): RuleAssetSavedObjectsClient => {
  return {
    find: (options) =>
      savedObjectsClient.find<IRuleAssetSavedObject>({
        ...options,
        type: ruleAssetSavedObjectType,
      }),
    all: async () => {
      const finder = savedObjectsClient.createPointInTimeFinder({
        perPage: DEFAULT_PAGE_SIZE,
        type: ruleAssetSavedObjectType,
      });
      const responses: IRuleAssetSavedObject[] = [];
      for await (const response of finder.find()) {
        responses.push(...response.saved_objects.map((so) => so as IRuleAssetSavedObject));
      }
      await finder.close();
      return responses;
    },
  };
};
