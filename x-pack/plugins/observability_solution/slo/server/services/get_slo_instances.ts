/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AggregationsCompositeAggregate,
  AggregationsCompositeAggregation,
} from '@elastic/elasticsearch/lib/api/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ALL_VALUE, GetSLOInstancesParams, GetSLOInstancesResponse } from '@kbn/slo-schema';
import { SLO_SUMMARY_DESTINATION_INDEX_NAME } from '../../common/constants';
import { SLODefinition, SLOSettings } from '../domain/models';
import { SloDefinitionClient } from './slo_definition_client';

const DEFAULT_SIZE = 100;

export class GetSLOInstances {
  constructor(
    private definitionClient: SloDefinitionClient,
    private esClient: ElasticsearchClient,
    private sloSettings: SLOSettings,
    private spaceId: string
  ) {}

  public async execute(
    sloId: string,
    params: GetSLOInstancesParams
  ): Promise<GetSLOInstancesResponse> {
    const { slo } = await this.definitionClient.execute(sloId, this.spaceId, params?.remoteName);

    const groupingKeys = [slo.groupBy].flat();
    if (groupingKeys.includes(ALL_VALUE)) {
      return { results: [] };
    }

    if (params?.groupingKey && !groupingKeys.includes(params.groupingKey)) {
      return { results: [] };
    }

    const response = await this.esClient.search<
      unknown,
      Record<string, AggregationsCompositeAggregate>
    >({
      index: params?.remoteName
        ? `${params.remoteName}:${SLO_SUMMARY_DESTINATION_INDEX_NAME}`
        : SLO_SUMMARY_DESTINATION_INDEX_NAME,
      ...generateQuery(slo, params, groupingKeys, this.sloSettings),
    });

    return {
      results: Object.entries(response.aggregations ?? {}).map(([groupingKey, agg]) => {
        // @ts-ignore
        const values = agg.buckets.map((bucket) => bucket.key[groupingKey]);
        const afterKey =
          agg.buckets.length === Number(params?.size ?? DEFAULT_SIZE)
            ? agg.after_key?.[groupingKey]
            : undefined;
        return { groupingKey, values, afterKey };
      }),
    };
  }
}

function generateQuery(
  slo: SLODefinition,
  params: GetSLOInstancesParams,
  groupingKeys: string[],
  settings: SLOSettings
) {
  const aggs = generateAggs(groupingKeys, params);

  const query = {
    size: 0,
    query: {
      bool: {
        filter: [
          {
            term: {
              'slo.id': slo.id,
            },
          },
          // exclude stale summary documents if specified
          ...(!!params?.excludeStale
            ? [
                {
                  range: {
                    summaryUpdatedAt: {
                      gte: `now-${settings.staleThresholdInHours}h`,
                    },
                  },
                },
              ]
            : []),
          // search on the specified grouping key only
          ...(params?.search && params?.groupingKey
            ? [
                {
                  query_string: {
                    default_field: `slo.groupings.${params.groupingKey}`,
                    query: `*${params.search.replace(/^\*/, '').replace(/\*$/, '')}*`,
                  },
                },
              ]
            : []),
        ],
      },
    },
    aggs,
  };

  return query;
}

function generateAggs(
  groupingKeys: string[],
  params: GetSLOInstancesParams
): Record<string, { composite: AggregationsCompositeAggregation }> {
  // when no groupingKey specified, use every grouping keys as composite agg
  if (!params?.groupingKey) {
    return groupingKeys.reduce((aggs, groupingKey) => {
      aggs[groupingKey] = {
        composite: {
          size: Number(params?.size ?? DEFAULT_SIZE),
          sources: [
            {
              [groupingKey]: {
                terms: {
                  field: `slo.groupings.${groupingKey}`,
                },
              },
            },
          ],
        },
      };
      return aggs;
    }, {} as Record<string, { composite: AggregationsCompositeAggregation }>);
  }

  // otherwise return only the composite aggs for the selected groupingKey
  return {
    [params.groupingKey]: {
      composite: {
        size: Number(params?.size ?? DEFAULT_SIZE),
        sources: [
          {
            [params.groupingKey]: {
              terms: {
                field: `slo.groupings.${params.groupingKey}`,
              },
            },
          },
        ],
        ...(params.afterKey ? { after: { [params.groupingKey]: params.afterKey } } : {}),
      },
    },
  };
}
