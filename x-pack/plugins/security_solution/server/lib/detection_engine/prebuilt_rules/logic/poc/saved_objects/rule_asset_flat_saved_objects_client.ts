/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';

import type {
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkDeleteObject,
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
} from '@kbn/core/server';

import { RULE_ASSET_FLAT_SO_TYPE } from './rule_asset_flat_saved_objects_type';
import type {
  RuleAssetFlatAttributes,
  RuleAssetFlatSavedObject,
} from './rule_asset_flat_saved_objects_type';

const MAX_RULE_ASSETS_PER_REQUEST = 500;

export interface IFlatRuleAssetsClient {
  bulkDeleteAll(): Promise<void>;

  bulkCreate(rules: RuleAssetFlatAttributes[]): Promise<void>;

  find(
    options?: Omit<SavedObjectsFindOptions, 'type'>
  ): Promise<SavedObjectsFindResponse<RuleAssetFlatAttributes>>;

  all(): Promise<RuleAssetFlatSavedObject[]>;
}

type FindSelector<T> = (result: SavedObjectsFindResult<RuleAssetFlatAttributes>) => T;

export const createFlatRuleAssetsClient = (
  savedObjectsClient: SavedObjectsClientContract
): IFlatRuleAssetsClient => {
  const fetchAll = async <T>(selector: FindSelector<T>) => {
    const finder = savedObjectsClient.createPointInTimeFinder<RuleAssetFlatAttributes>({
      perPage: MAX_RULE_ASSETS_PER_REQUEST,
      type: RULE_ASSET_FLAT_SO_TYPE,
    });

    const result: T[] = [];

    for await (const response of finder.find()) {
      const selectedValues = response.saved_objects.map((so) => selector(so));
      result.push(...selectedValues);
    }

    await finder.close();

    return result;
  };

  return {
    bulkDeleteAll: async () => {
      const allIds = await fetchAll((so) => so.id);
      const allObjects: SavedObjectsBulkDeleteObject[] = allIds.map((id) => {
        return { type: RULE_ASSET_FLAT_SO_TYPE, id };
      });

      await savedObjectsClient.bulkDelete(allObjects, {
        refresh: 'wait_for',
        force: true,
      });
    },

    bulkCreate: async (rules: RuleAssetFlatAttributes[]) => {
      const objects: Array<SavedObjectsBulkCreateObject<RuleAssetFlatAttributes>> = rules.map(
        (rule) => ({ type: RULE_ASSET_FLAT_SO_TYPE, attributes: rule })
      );

      const chunks = chunk(objects, MAX_RULE_ASSETS_PER_REQUEST);

      for (const chunkOfObjects of chunks) {
        await savedObjectsClient.bulkCreate<RuleAssetFlatAttributes>(chunkOfObjects, {
          overwrite: true,
        });
      }
    },

    find: (options) =>
      savedObjectsClient.find<RuleAssetFlatAttributes>({
        ...options,
        type: RULE_ASSET_FLAT_SO_TYPE,
      }),

    all: () => {
      return fetchAll((so) => so);
    },
  };
};
