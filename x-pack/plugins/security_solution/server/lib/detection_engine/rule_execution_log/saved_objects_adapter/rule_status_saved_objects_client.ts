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
  SavedObjectsBulkGetObject,
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
    attributes: Partial<IRuleStatusSOAttributes>,
    options?: SavedObjectsCreateOptions
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
    // With migration from `alertId` to `references[].id` it's not possible to fetch
    // just the most recent RuleStatusSO's in one query as SO.find() API doesn't support
    // `reverse_nested` so you can't include the parent. Broken out into two queries,
    // first for fetching most recent RuleStatusSO id's, then the objects themself.
    // TODO: Still use one query but return all status SO's and filter server side? Perf test?

    // Query 1: Fetch most recent RuleStatusSO _id's
    const references = ids.map<SavedObjectsFindOptionsReference>((alertId) => ({
      id: alertId,
      type: 'alert',
    }));
    const order: 'desc' = 'desc';
    const nestedAggs = {
      references: {
        nested: {
          path: `${legacyRuleStatusSavedObjectType}.references`,
        },
        aggs: {
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
        },
      },
    };
    const statusIdResults = await savedObjectsClient.find({
      hasReference: references,
      aggs: nestedAggs,
      type: legacyRuleStatusSavedObjectType,
      perPage: 0,
    });
    const statusIdResultBuckets = get(statusIdResults, 'aggregations.references.alertIds.buckets');
    const ruleStatusIds: string[] = statusIdResultBuckets.map((b: unknown) => {
      const hits = get(b, 'most_recent_statuses.hits.hits');
      return get(hits, `[${hits.length - 1}]._id`); // TODO: top_hits agg doesn't appear to be working above
    });

    // Query 2: Retrieve RuleStatusSO objects via `_id`'s
    const objects: SavedObjectsBulkGetObject[] = ruleStatusIds.map((id) => ({
      type: legacyRuleStatusSavedObjectType,
      id: id.substring(`${legacyRuleStatusSavedObjectType}:`.length), // TODO: Any gotchas here w/ any potential additional share-capable prefixes
    }));
    const statusResult = await savedObjectsClient.bulkGet(objects);

    const hits = get(statusResult, 'saved_objects');
    return hits.reduce((acc: Record<string, IRuleStatusSOAttributes[]>, hit: unknown) => {
      const alertId: string = get(hit, `references[0].id`);
      // TODO: Fine to not support multi-status now?
      acc[alertId] = [get(hit, 'attributes')];
      return acc;
    }, {});
  },
  create: (attributes, options) => {
    return savedObjectsClient.create(legacyRuleStatusSavedObjectType, attributes, options);
  },
  update: (id, attributes, options) =>
    savedObjectsClient.update(legacyRuleStatusSavedObjectType, id, attributes, options),
  delete: (id) => savedObjectsClient.delete(legacyRuleStatusSavedObjectType, id),
});
