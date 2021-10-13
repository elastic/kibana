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
  SavedObjectsFindOptionsReference,
  SavedObjectsCreateOptions,
} from 'kibana/server';
// eslint-disable-next-line no-restricted-imports
import { legacyRuleStatusSavedObjectType } from '../../rules/legacy_rule_status/legacy_rule_status_saved_object_mappings';
import { IRuleStatusSOAttributes } from '../../rules/types';

export interface RuleStatusSavedObjectsClient {
  find: (
    options?: Omit<SavedObjectsFindOptions, 'type'>
  ) => Promise<Array<SavedObjectsFindResult<IRuleStatusSOAttributes>>>;
  findBulk: (ids: string[], statusesPerId: number) => Promise<FindBulkResponse>;
  create: (
    attributes: IRuleStatusSOAttributes,
    options?: SavedObjectsCreateOptions
  ) => Promise<SavedObject<IRuleStatusSOAttributes>>;
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
 * @deprecated Use RuleExecutionLogClient instead
 */
export const ruleStatusSavedObjectsClientFactory = (
  savedObjectsClient: SavedObjectsClientContract
): RuleStatusSavedObjectsClient => ({
  find: async (options) => {
    const result = await savedObjectsClient.find<IRuleStatusSOAttributes>({
      ...options,
      type: legacyRuleStatusSavedObjectType,
    });
    return result.saved_objects;
  },
  findBulk: async (ids, statusesPerId) => {
    if (ids.length === 0) {
      return {};
    }
    const references = ids.map<SavedObjectsFindOptionsReference>((alertId) => ({
      id: alertId,
      type: 'alert',
    }));
    const order: 'desc' = 'desc';
    const aggs = {
      alertIds: {
        terms: {
          field: `${legacyRuleStatusSavedObjectType}.references.id`,
          size: ids.length,
        },
        aggs: {
          most_recent_statuses: {
            top_hits: {
              sort: [
                {
                  [`${legacyRuleStatusSavedObjectType}.statusDate`]: {
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
      hasReference: references,
      aggs,
      type: legacyRuleStatusSavedObjectType,
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
  create: (attributes, options) => {
    return savedObjectsClient.create(legacyRuleStatusSavedObjectType, attributes, options);
  },
  update: (id, attributes) =>
    savedObjectsClient.update(legacyRuleStatusSavedObjectType, id, attributes),
  delete: (id) => savedObjectsClient.delete(legacyRuleStatusSavedObjectType, id),
});
