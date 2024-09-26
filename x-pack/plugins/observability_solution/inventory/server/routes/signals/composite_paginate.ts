/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsCompositeAggregateKey } from '@elastic/elasticsearch/lib/api/types';
import { AggregationOptionsByType } from '@kbn/es-types';
import { InferSearchResponseOf } from '@kbn/es-types/src/search';
import { Logger } from '@kbn/logging';
import { withInventorySpan } from '../../lib/with_inventory_span';

export type GroupsCompositeSubAggregationMap = Record<
  string,
  Pick<AggregationOptionsByType, 'filter'>
>;

export type CompositeSourceFieldMap = Record<
  string,
  {
    missing_bucket: boolean;
    alias?: string;
  }
>;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
type GroupsCompositeAggregation<
  TSourceFieldMap extends CompositeSourceFieldMap,
  TAggregationMap extends GroupsCompositeSubAggregationMap | undefined = undefined
> = {
  groups: {
    composite: {
      after?: AggregationsCompositeAggregateKey;
      sources: Array<{
        [key in keyof TSourceFieldMap]: {
          terms: { field: string; missing_bucket: TSourceFieldMap[key]['missing_bucket'] };
        };
      }>;
      size: number;
    };
    aggs?: TAggregationMap;
  };
};

type CompositeResultOf<
  TSourceFieldMap extends CompositeSourceFieldMap,
  TAggregationMap extends GroupsCompositeSubAggregationMap | undefined = undefined
> = Pick<
  InferSearchResponseOf<
    any,
    { aggregations: GroupsCompositeAggregation<TSourceFieldMap, TAggregationMap> }
  >,
  'aggregations'
>;

type CompositeBucketOf<
  TSourceFieldMap extends CompositeSourceFieldMap,
  TAggregationMap extends GroupsCompositeSubAggregationMap | undefined = undefined
> = Required<
  CompositeResultOf<TSourceFieldMap, TAggregationMap>
>['aggregations']['groups']['buckets'][number];

export type CompositeKeysOf<TSourceFieldMap extends CompositeSourceFieldMap> = Required<
  Required<CompositeResultOf<TSourceFieldMap, undefined>>['aggregations']['groups']
>['after_key'];

const PAGE_SIZE = 10_000;

export type CompositePaginateCallback<
  TSourceFieldMap extends CompositeSourceFieldMap,
  TAggregationMap extends GroupsCompositeSubAggregationMap | undefined = undefined
> = (request: {
  aggs: GroupsCompositeAggregation<TSourceFieldMap, TAggregationMap>;
}) => Promise<CompositeResultOf<TSourceFieldMap, TAggregationMap>>;

export async function compositePaginate<
  TSourceFieldMap extends CompositeSourceFieldMap,
  TAggregationMap extends GroupsCompositeSubAggregationMap | undefined = undefined
>(
  {
    logger,
    aggs,
    fields,
  }: {
    logger: Logger;
    aggs?: TAggregationMap;
    fields: TSourceFieldMap;
  },
  callback: CompositePaginateCallback<TSourceFieldMap, TAggregationMap>
): Promise<{
  groups: Array<CompositeBucketOf<TSourceFieldMap, TAggregationMap>>;
}> {
  async function getNextPage({
    afterKey,
  }: {
    afterKey: AggregationsCompositeAggregateKey | undefined;
  }): Promise<Array<CompositeBucketOf<TSourceFieldMap, TAggregationMap>>> {
    const response = await withInventorySpan(
      'get_page',
      () =>
        callback({
          aggs: {
            groups: {
              composite: {
                after: afterKey,
                sources: Object.entries(fields).map(
                  ([fieldName, { missing_bucket: missingBucket, alias }]) => {
                    return {
                      [fieldName]: {
                        terms: {
                          field: alias || fieldName,
                          missing_bucket: missingBucket,
                        },
                      },
                    };
                  }
                ) as GroupsCompositeAggregation<
                  TSourceFieldMap,
                  TAggregationMap
                >['groups']['composite']['sources'],
                size: 10_000,
              },
              aggs,
            },
          },
        }),
      logger
    );

    const result = response.aggregations?.groups;

    const buckets = result?.buckets ?? [];

    if (result?.after_key && buckets.length < PAGE_SIZE) {
      return [...buckets, ...(await getNextPage({ afterKey: result.after_key }))];
    }
    return buckets;
  }

  const groups = await getNextPage({ afterKey: undefined });

  return {
    groups,
  };
}
