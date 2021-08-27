/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import {
  SavedObjectsClientContract,
  SavedObject,
  SavedObjectsUpdateResponse,
  SavedObjectsFindOptions,
  SavedObjectsFindResult,
} from '../../../../../../../../src/core/server';
import { ruleStatusSavedObjectType } from '../../rules/saved_object_mappings';
import { IRuleStatusSOAttributes } from '../../rules/types';
import { buildChunkedOrFilter } from '../../signals/utils';

export interface RuleStatusSavedObjectsClient {
  find: (
    options?: Omit<SavedObjectsFindOptions, 'type'>
  ) => Promise<Array<SavedObjectsFindResult<IRuleStatusSOAttributes>>>;
  findBulk: (ids: string[], statusesPerId: number) => Promise<FindBulkResponse>;
  create: (attributes: IRuleStatusSOAttributes) => Promise<SavedObject<IRuleStatusSOAttributes>>;
  update: (
    id: string,
    attributes: Partial<IRuleStatusSOAttributes>
  ) => Promise<SavedObjectsUpdateResponse<IRuleStatusSOAttributes>>;
  delete: (id: string) => Promise<{}>;
}

export interface FindBulkResponse {
  [key: string]: IRuleStatusSOAttributes[] | undefined;
}

/**
 * @pdeprecated Use RuleExecutionLogClient instead
 */
export const ruleStatusSavedObjectsClientFactory = (
  savedObjectsClient: SavedObjectsClientContract
): RuleStatusSavedObjectsClient => ({
  find: async (options) => {
    const result = await savedObjectsClient.find<IRuleStatusSOAttributes>({
      ...options,
      type: ruleStatusSavedObjectType,
    });
    return result.saved_objects;
  },
  findBulk: async (ids, statusesPerId) => {
    if (ids.length === 0) {
      return {};
    }
    const filter = buildChunkedOrFilter(`${ruleStatusSavedObjectType}.attributes.alertId`, ids);
    const order: 'desc' = 'desc';
    const aggs = {
      alertIds: {
        terms: {
          field: `${ruleStatusSavedObjectType}.attributes.alertId`,
          size: ids.length,
        },
        aggs: {
          most_recent_statuses: {
            top_hits: {
              sort: [
                {
                  [`${ruleStatusSavedObjectType}.statusDate`]: {
                    order,
                  },
                },
              ],
              size: statusesPerId,
            },
          },
        },
      },
    };
    const results = await savedObjectsClient.find({
      filter,
      aggs,
      type: ruleStatusSavedObjectType,
      perPage: 0,
    });
    const buckets = get(results, 'aggregations.alertIds.buckets');
    return buckets.reduce((acc: Record<string, unknown>, bucket: unknown) => {
      const key = get(bucket, 'key');
      const hits = get(bucket, 'most_recent_statuses.hits.hits');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statuses = hits.map((hit: any) => hit._source['siem-detection-engine-rule-status']);
      acc[key] = statuses;
      return acc;
    }, {});
  },
  create: (attributes) => savedObjectsClient.create(ruleStatusSavedObjectType, attributes),
  update: (id, attributes) => savedObjectsClient.update(ruleStatusSavedObjectType, id, attributes),
  delete: (id) => savedObjectsClient.delete(ruleStatusSavedObjectType, id),
});
