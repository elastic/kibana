/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsMultiBucketAggregateBase } from '@elastic/elasticsearch/lib/api/types';
import type { AggregationsTopHitsAggregate } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { invariant } from '../../../../../../common/utils/invariant';
import { withSecuritySpan } from '../../../../../utils/with_security_span';
import type { PrebuiltRuleAsset } from '../../model/rule_assets/prebuilt_rule_asset';
import { validatePrebuiltRuleAssets } from './prebuilt_rule_assets_validation';
import { PREBUILT_RULE_ASSETS_SO_TYPE } from './prebuilt_rule_assets_type';
import type { RuleVersionSpecifier } from '../../model/rule_versions/rule_version_specifier';

const MAX_PREBUILT_RULES_COUNT = 10_000;

export interface IPrebuiltRuleAssetsClient {
  fetchLatestAssets: () => Promise<PrebuiltRuleAsset[]>;

  fetchLatestVersions(ruleIds?: string[]): Promise<RuleVersionSpecifier[]>;

  fetchAssetsByVersion(versions: RuleVersionSpecifier[]): Promise<PrebuiltRuleAsset[]>;
}

export const createPrebuiltRuleAssetsClient = (
  savedObjectsClient: SavedObjectsClientContract
): IPrebuiltRuleAssetsClient => {
  return {
    fetchLatestAssets: () => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchLatestAssets', async () => {
        const findResult = await savedObjectsClient.find<
          PrebuiltRuleAsset,
          {
            rules: AggregationsMultiBucketAggregateBase<{
              latest_version: AggregationsTopHitsAggregate;
            }>;
          }
        >({
          type: PREBUILT_RULE_ASSETS_SO_TYPE,
          aggs: {
            rules: {
              terms: {
                field: `${PREBUILT_RULE_ASSETS_SO_TYPE}.attributes.rule_id`,
                size: MAX_PREBUILT_RULES_COUNT,
              },
              aggs: {
                latest_version: {
                  top_hits: {
                    size: 1,
                    sort: {
                      [`${PREBUILT_RULE_ASSETS_SO_TYPE}.version`]: 'desc',
                    },
                  },
                },
              },
            },
          },
        });

        const buckets = findResult.aggregations?.rules?.buckets ?? [];
        invariant(Array.isArray(buckets), 'Expected buckets to be an array');

        const ruleAssets = buckets.map((bucket) => {
          const hit = bucket.latest_version.hits.hits[0];
          return hit._source[PREBUILT_RULE_ASSETS_SO_TYPE];
        });

        return validatePrebuiltRuleAssets(ruleAssets);
      });
    },

    fetchLatestVersions: (ruleIds: string[] = []): Promise<RuleVersionSpecifier[]> => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchLatestVersions', async () => {
        const filter = ruleIds
          .map((ruleId) => `${PREBUILT_RULE_ASSETS_SO_TYPE}.attributes.rule_id: ${ruleId}`)
          .join(' OR ');

        const findResult = await savedObjectsClient.find<
          PrebuiltRuleAsset,
          {
            rules: AggregationsMultiBucketAggregateBase<{
              latest_version: AggregationsTopHitsAggregate;
            }>;
          }
        >({
          type: PREBUILT_RULE_ASSETS_SO_TYPE,
          filter,
          aggs: {
            rules: {
              terms: {
                field: `${PREBUILT_RULE_ASSETS_SO_TYPE}.attributes.rule_id`,
                size: MAX_PREBUILT_RULES_COUNT,
              },
              aggs: {
                latest_version: {
                  top_hits: {
                    size: 1,
                    sort: [
                      {
                        [`${PREBUILT_RULE_ASSETS_SO_TYPE}.version`]: 'desc',
                      },
                    ],
                    _source: [
                      `${PREBUILT_RULE_ASSETS_SO_TYPE}.rule_id`,
                      `${PREBUILT_RULE_ASSETS_SO_TYPE}.version`,
                    ],
                  },
                },
              },
            },
          },
        });

        const buckets = findResult.aggregations?.rules?.buckets ?? [];
        invariant(Array.isArray(buckets), 'Expected buckets to be an array');

        return buckets.map((bucket) => {
          const hit = bucket.latest_version.hits.hits[0];
          const soAttributes = hit._source[PREBUILT_RULE_ASSETS_SO_TYPE];
          const versionInfo: RuleVersionSpecifier = {
            rule_id: soAttributes.rule_id,
            version: soAttributes.version,
          };
          return versionInfo;
        });
      });
    },

    fetchAssetsByVersion: (versions: RuleVersionSpecifier[]): Promise<PrebuiltRuleAsset[]> => {
      return withSecuritySpan('IPrebuiltRuleAssetsClient.fetchAssetsByVersion', async () => {
        if (versions.length === 0) {
          // NOTE: without early return it would build incorrect filter and fetch all existing saved objects
          return [];
        }

        const attr = `${PREBUILT_RULE_ASSETS_SO_TYPE}.attributes`;
        const filter = versions
          .map((v) => `(${attr}.rule_id: ${v.rule_id} AND ${attr}.version: ${v.version})`)
          .join(' OR ');

        const findResult = await savedObjectsClient.find<PrebuiltRuleAsset>({
          type: PREBUILT_RULE_ASSETS_SO_TYPE,
          filter,
          perPage: MAX_PREBUILT_RULES_COUNT,
        });

        const ruleAssets = findResult.saved_objects.map((so) => so.attributes);
        return validatePrebuiltRuleAssets(ruleAssets);
      });
    },
  };
};
