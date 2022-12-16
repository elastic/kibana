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
  SavedObjectsFindResult,
} from '@kbn/core/server';

import { withSecuritySpan } from '../../../../../../utils/with_security_span';
import type { PrebuiltRuleContent } from '../../../../../../../common/detection_engine/prebuilt_rules/poc/content_model/prebuilt_rule_content';
import type { PrebuiltRuleVersionInfo } from '../../../../../../../common/detection_engine/prebuilt_rules/poc/content_model/prebuilt_rule_version_info';
import type { SemanticVersion } from '../../../../../../../common/detection_engine/prebuilt_rules/poc/content_model/semantic_version';
import type { RuleSignatureId } from '../../../../../../../common/detection_engine/rule_schema';
import { RULE_ASSET_FLAT_SO_TYPE } from './rule_asset_flat_saved_objects_type';
import type { RuleAssetFlatAttributes } from './rule_asset_flat_saved_objects_type';

const MAX_RULE_ASSETS_PER_REQUEST = 500;

export interface IFlatRuleAssetsClient {
  bulkDeleteAll(): Promise<void>;

  bulkCreate(rules: RuleAssetFlatAttributes[]): Promise<void>;

  fetchLatestVersions(): Promise<PrebuiltRuleVersionInfo[]>;

  fetchRulesByIdAndVersion(args: FetchSpecificRulesArgs): Promise<PrebuiltRuleContent[]>;
}

export interface FetchSpecificRulesArgs {
  rules: Array<{ id: RuleSignatureId; version: SemanticVersion }>;
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
    bulkDeleteAll: (): Promise<void> => {
      return withSecuritySpan('IFlatRuleAssetsClient.bulkDeleteAll', async () => {
        const allIds = await fetchAll((so) => so.id);
        const allObjects: SavedObjectsBulkDeleteObject[] = allIds.map((id) => {
          return { type: RULE_ASSET_FLAT_SO_TYPE, id };
        });

        await savedObjectsClient.bulkDelete(allObjects, {
          refresh: false,
          force: true,
        });
      });
    },

    bulkCreate: (rules: RuleAssetFlatAttributes[]): Promise<void> => {
      return withSecuritySpan('IFlatRuleAssetsClient.bulkCreate', async () => {
        const objects: Array<SavedObjectsBulkCreateObject<RuleAssetFlatAttributes>> = rules.map(
          (rule) => ({
            id: `${rule.rule_id}:${rule.rule_content_version}`,
            type: RULE_ASSET_FLAT_SO_TYPE,
            attributes: rule,
          })
        );

        const chunks = chunk(objects, MAX_RULE_ASSETS_PER_REQUEST);

        for (const chunkOfObjects of chunks) {
          await savedObjectsClient.bulkCreate<RuleAssetFlatAttributes>(chunkOfObjects, {
            refresh: false,
            overwrite: true,
          });
        }
      });
    },

    fetchLatestVersions: (): Promise<PrebuiltRuleVersionInfo[]> => {
      return withSecuritySpan('IFlatRuleAssetsClient.fetchLatestVersions', async () => {
        /*
          GET .kibana/_search
          {
            "size": 0,
            "query": {
              "term": { "type": "security-rule-flat" }
            },
            "aggs": {
              "rules": {
                "terms": {
                  "field": "security-rule-flat.rule_id",
                  "size": 10000
                },
                "aggs": {
                  "latest_version": {
                    "top_hits": {
                      "size": 1,
                      "sort": [
                        {
                          "security-rule-flat.rule_content_version": {
                            "order": "desc"
                          }
                        }
                      ],
                      "_source": {
                        "includes": [
                          "security-rule-flat.rule_id",
                          "security-rule-flat.rule_content_version",
                          "security-rule-flat.stack_version_min",
                          "security-rule-flat.stack_version_max"
                        ]
                      }
                    }
                  }
                }
              }
            }
          }
        */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const findResult = await savedObjectsClient.find<RuleAssetFlatAttributes, any>({
          type: RULE_ASSET_FLAT_SO_TYPE,
          aggs: {
            rules: {
              terms: {
                field: `${RULE_ASSET_FLAT_SO_TYPE}.attributes.rule_id`,
                size: 10000,
              },
              aggs: {
                latest_version: {
                  top_hits: {
                    size: 1,
                    sort: [
                      {
                        [`${RULE_ASSET_FLAT_SO_TYPE}.rule_content_version`]: {
                          order: 'desc',
                        },
                      },
                    ],
                    _source: [
                      `${RULE_ASSET_FLAT_SO_TYPE}.rule_id`,
                      `${RULE_ASSET_FLAT_SO_TYPE}.rule_content_version`,
                      `${RULE_ASSET_FLAT_SO_TYPE}.stack_version_min`,
                      `${RULE_ASSET_FLAT_SO_TYPE}.stack_version_max`,
                    ],
                  },
                },
              },
            },
          },
        });

        /*
          "aggregations": {
            "rules": {
              "doc_count_error_upper_bound": 0,
              "sum_other_doc_count": 0,
              "buckets": [
                {
                  "key": "000047bb-b27a-47ec-8b62-ef1a5d2c9e19",
                  "doc_count": 10,
                  "latest_version": {
                    "hits": {
                      "total": {
                        "value": 10,
                        "relation": "eq"
                      },
                      "max_score": null,
                      "hits": [
                        {
                          "_index": ".kibana_8.7.0_001",
                          "_id": "security-rule-flat:000047bb-b27a-47ec-8b62-ef1a5d2c9e19:102.0.9",
                          "_score": null,
                          "_source": {
                            "security-rule-flat": {
                              "rule_id": "000047bb-b27a-47ec-8b62-ef1a5d2c9e19",
                              "rule_content_version": "102.0.9",
                              "stack_version_min": "8.5.0",
                              "stack_version_max": "8.7.0"
                            }
                          },
                          "sort": [
                            "102.0.9"
                          ]
                        }
                      ]
                    }
                  }
                },
        */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const buckets: any[] = findResult.aggregations?.rules?.buckets ?? [];

        return buckets.map((bucket) => {
          const hit = bucket.latest_version.hits.hits[0];
          const soAttributes = hit._source[RULE_ASSET_FLAT_SO_TYPE];
          const versionInfo: PrebuiltRuleVersionInfo = {
            rule_id: soAttributes.rule_id,
            rule_content_version: soAttributes.rule_content_version,
            stack_version_min: soAttributes.stack_version_min,
            stack_version_max: soAttributes.stack_version_max,
          };
          return versionInfo;
        });
      });
    },

    fetchRulesByIdAndVersion: (args: FetchSpecificRulesArgs): Promise<PrebuiltRuleContent[]> => {
      return withSecuritySpan('IFlatRuleAssetsClient.fetchRulesByIdAndVersion', async () => {
        const { rules } = args;

        if (rules.length === 0) {
          // NOTE: without early return it would build incorrect filter and fetch all existing saved objects
          return [];
        }

        const attr = `${RULE_ASSET_FLAT_SO_TYPE}.attributes`;
        const filter = rules
          .map(
            (rule) =>
              `(${attr}.rule_id: ${rule.id} AND ${attr}.rule_content_version: ${rule.version})`
          )
          .join(' OR ');

        const findResult = await savedObjectsClient.find<RuleAssetFlatAttributes>({
          type: RULE_ASSET_FLAT_SO_TYPE,
          filter,
          perPage: 10000,
        });

        // TODO: Validate that returned objects match the schema of PrebuiltRuleContent
        return findResult.saved_objects.map((so) => so.attributes as PrebuiltRuleContent);
      });
    },
  };
};
