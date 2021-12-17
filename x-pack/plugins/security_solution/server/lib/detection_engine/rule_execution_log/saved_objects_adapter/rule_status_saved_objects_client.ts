/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsCreateOptions,
  SavedObjectsFindOptions,
  SavedObjectsFindOptionsReference,
  SavedObjectsFindResult,
  SavedObjectsUpdateResponse,
} from 'kibana/server';
import { get } from 'lodash';
import { withSecuritySpan } from '../../../../utils/with_security_span';
// eslint-disable-next-line no-restricted-imports
import { legacyRuleStatusSavedObjectType } from '../../rules/legacy_rule_status/legacy_rule_status_saved_object_mappings';
import { IRuleStatusSOAttributes } from '../../rules/types';

export interface RuleStatusSavedObjectsClient {
  find: (
    options: Omit<SavedObjectsFindOptions, 'type'> & { ruleId: string }
  ) => Promise<Array<SavedObjectsFindResult<IRuleStatusSOAttributes>>>;
  findBulk: (ids: string[], statusesPerId: number) => Promise<FindBulkResponse>;
  create: (
    attributes: IRuleStatusSOAttributes,
    options: SavedObjectsCreateOptions
  ) => Promise<SavedObject<IRuleStatusSOAttributes>>;
  update: (
    id: string,
    attributes: Partial<IRuleStatusSOAttributes>,
    options: SavedObjectsCreateOptions
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
    return withSecuritySpan('RuleStatusSavedObjectsClient.find', async () => {
      const references = {
        id: options.ruleId,
        type: 'alert',
      };
      const result = await savedObjectsClient.find<IRuleStatusSOAttributes>({
        ...options,
        type: legacyRuleStatusSavedObjectType,
        hasReference: references,
      });
      return result.saved_objects;
    });
  },
  findBulk: async (ids, statusesPerId) => {
    if (ids.length === 0) {
      return {};
    }
    return withSecuritySpan('RuleStatusSavedObjectsClient.findBulk', async () => {
      const references = ids.map<SavedObjectsFindOptionsReference>((alertId) => ({
        id: alertId,
        type: 'alert',
      }));
      const order: 'desc' = 'desc';
      // NOTE: Once https://github.com/elastic/kibana/issues/115153 is resolved
      // ${legacyRuleStatusSavedObjectType}.statusDate will need to be updated to
      // ${legacyRuleStatusSavedObjectType}.attributes.statusDate
      const aggs = {
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
                rule_status: {
                  reverse_nested: {},
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
          },
        },
      };
      const results = await savedObjectsClient.find({
        hasReference: references,
        aggs,
        type: legacyRuleStatusSavedObjectType,
        perPage: 0,
      });
      const buckets = get(results, 'aggregations.references.alertIds.buckets');
      return buckets.reduce((acc: Record<string, unknown>, bucket: unknown) => {
        const key = get(bucket, 'key');
        const hits = get(bucket, 'rule_status.most_recent_statuses.hits.hits');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        acc[key] = hits.map((hit: any) => hit._source[legacyRuleStatusSavedObjectType]);
        return acc;
      }, {});
    });
  },
  create: (attributes, options) =>
    withSecuritySpan('RuleStatusSavedObjectsClient.create', () =>
      savedObjectsClient.create(legacyRuleStatusSavedObjectType, attributes, options)
    ),
  update: (id, attributes, options) =>
    withSecuritySpan('RuleStatusSavedObjectsClient.update', () =>
      savedObjectsClient.update(legacyRuleStatusSavedObjectType, id, attributes, options)
    ),
  delete: (id) =>
    withSecuritySpan('RuleStatusSavedObjectsClient.delete', () =>
      savedObjectsClient.delete(legacyRuleStatusSavedObjectType, id)
    ),
});
