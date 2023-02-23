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
import { ruleAssetSavedObjectType } from './rule_asset_saved_object_mappings';

const MAX_PREBUILT_RULES_COUNT = 10_000;

export interface IRuleAssetSOAttributes extends Record<string, unknown> {
  rule_id: string | null | undefined;
  version: string | null | undefined;
  name: string | null | undefined;
}

export interface IRuleAssetSavedObject {
  type: string;
  id: string;
  attributes: IRuleAssetSOAttributes;
}

export interface IRuleAssetsClient {
  fetchLatestVersions: () => Promise<IRuleAssetSOAttributes[]>;
}

export const ruleAssetsClientFactory = (
  savedObjectsClient: SavedObjectsClientContract
): IRuleAssetsClient => {
  return {
    fetchLatestVersions: () => {
      return withSecuritySpan('RuleAssetsClient.fetchLatestVersions', async () => {
        const findResult = await savedObjectsClient.find<
          IRuleAssetSavedObject,
          {
            rules: AggregationsMultiBucketAggregateBase<{
              latest_version: AggregationsTopHitsAggregate;
            }>;
          }
        >({
          type: ruleAssetSavedObjectType,
          aggs: {
            rules: {
              terms: {
                field: `${ruleAssetSavedObjectType}.attributes.rule_id`,
                size: MAX_PREBUILT_RULES_COUNT,
              },
              aggs: {
                latest_version: {
                  top_hits: {
                    size: 1,
                    sort: {
                      [`${ruleAssetSavedObjectType}.version`]: 'desc',
                    },
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
          return hit._source[ruleAssetSavedObjectType];
        });
      });
    },
  };
};
