/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from 'react-query';
import moment from 'moment-timezone';
import { lastValueFrom } from 'rxjs';
import { find, reduce } from 'lodash';

import { DataView, SortDirection } from '@kbn/data-plugin/common';
import { useKibana } from '../common/lib/kibana';
import { PackSOFormData } from './queries/use_pack_query_form';

interface ILastResultConfig {
  data: PackSOFormData[];
  packName: string;
  logsDataView?: DataView;
  skip?: boolean;
}

export interface ILastResult {
  '@timestamp': Date | string | number;
  docCount?: number;
  uniqueAgentsCount: number;
}

interface ITimestampBucket {
  doc_count: number;
  key: number;
  key_as_string: string;
}

interface IActionBucket {
  doc_count: number;
  key: string;
  timestamps: {
    buckets: ITimestampBucket[];
  };
}

interface IResultAggregation {
  doc_count: number;
  meta: {
    timestamp: string;
  };
  unique_agents: {
    value: number;
  };
}

export const usePackQueryLastResults = ({
  data,
  packName,
  logsDataView,
  skip = false,
}: ILastResultConfig) => {
  const kibanaData = useKibana().services.data;

  const getAggsByIds = (
    ids: string[],
    timestampBuckets: IActionBucket[]
  ): Record<string, unknown> =>
    ids.reduce((acc, item) => {
      const timestamp = find(timestampBuckets, ['key', item])?.timestamps.buckets[0].key_as_string;

      return {
        ...acc,
        [item]: {
          aggs: {
            unique_agents: {
              cardinality: { field: 'agent.id' },
            },
          },
          meta: {
            timestamp,
          },
          filter: {
            bool: {
              filter: [
                {
                  range: {
                    '@timestamp': {
                      gte: moment(timestamp).subtract(60, 'seconds').format(),
                      lte: moment(timestamp).format(),
                    },
                  },
                },
                {
                  match_phrase: {
                    action_id: item,
                  },
                },
              ],
            },
          },
        },
      };
    }, {});

  return useQuery(
    ['scheduledQueryLastResultsaLsdisst', packName],
    async () => {
      const ids = data.reduce((acc: string[], item) => [...acc, `pack_${packName}_${item.id}`], []);
      const lastResultsSearchSource = await kibanaData.search.searchSource.create({
        query: {
          // @ts-expect-error update types
          terms: {
            action_id: ids,
          },
        },
        aggs: {
          // @ts-expect-error update types
          actions: {
            terms: {
              field: 'action_id',
            },
            aggs: {
              timestamps: {
                terms: {
                  field: '@timestamp',
                  order: { _key: SortDirection.desc },
                  size: 1,
                },
              },
            },
          },
        },
      });

      lastResultsSearchSource.setField('index', logsDataView);

      const lastResultsResponse = await lastValueFrom(lastResultsSearchSource.fetch$());

      const timestampBuckets = (
        lastResultsResponse?.rawResponse?.aggregations?.actions as { buckets: IActionBucket[] }
      ).buckets;
      const aggs = getAggsByIds(ids, timestampBuckets);
      const aggsSearchSource = await kibanaData.search.searchSource.create({
        size: 1,
        // @ts-expect-error update types  --- TODO: Any idea how to cast this?
        aggs,
      });
      aggsSearchSource.setField('index', logsDataView);

      const aggsResponse = await aggsSearchSource.fetch$().toPromise();

      const result: Record<string, ILastResult> = reduce(
        aggsResponse?.rawResponse?.aggregations as unknown as IResultAggregation[],
        (acc, item, index): Record<string, ILastResult> => ({
          ...acc,
          [index]: {
            '@timestamp': item?.meta?.timestamp,
            uniqueAgentsCount: item.unique_agents.value,
            docCount: item.doc_count,
          },
        }),
        {}
      );

      return result;
    },
    {
      keepPreviousData: true,
      enabled: !!(!skip && data.length && logsDataView),
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};
