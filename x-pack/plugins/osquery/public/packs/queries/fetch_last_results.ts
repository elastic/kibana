/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';
import moment from 'moment-timezone';

import { DataView, SortDirection } from '@kbn/data-plugin/common';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';

import { Reducer } from 'react';
import { useQuery } from 'react-query';
import { find } from 'lodash';
import { useKibana } from '../../common/lib/kibana';
import { PackSOFormData } from './use_pack_query_form';

const getPackActionId = (actionId: string, packName: string) => `pack_${packName}_${actionId}`;

interface IInitialState {
  lastResults: ILastResult[] | null;
  errorResults: ILastResultErrors[] | null;
  loading: boolean;
}

interface ILastResultAction {
  type: 'setLastResults';
  payload: Record<string, unknown>;
}

export const lastResultsReducer: Reducer<IInitialState, ILastResultAction> = (state, action) => ({
  ...state,
  ...action.payload,
});

interface ILastResultConfig {
  kibanaData: DataPublicPluginStart;
  data: PackSOFormData[];
  packName: string;
  logsDataView?: DataView;
}

export interface ILastResult {
  '@timestamp': Date | string | number;
  docCount?: number;
  uniqueAgentsCount: number;
}

export interface ILastResultErrors {
  hits: unknown[];
  max_score: number | null;
  total: number;
}

export const useFetchLastResults = ({ data, packName, logsDataView }: ILastResultConfig) => {
  const kibanaData = useKibana().services.data;

  const getAggsByIds = (ids, timestampsActions) =>
    ids.reduce((acc, item) => {
      const timestamp = find(timestampsActions, ['key', item]).timestamps.buckets[0].key_as_string;

      return {
        ...acc,
        [item]: {
          query: {
            // @ts-expect-error update types
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
    }, []);

  return useQuery(
    ['scheduledQueryLastResultsaLsdisst'],
    async () => {
      const ids = data.reduce((acc, item) => [...acc, `pack_${packName}_${item.id}`], []);
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
              // test: 'action_id',
            },
            aggs: {
              timestamps: {
                terms: {
                  field: '@timestamp',
                  order: { _key: 'desc' },
                  size: 1,
                },
              },
            },
          },
        },
      });

      lastResultsSearchSource.setField('index', logsDataView);

      const lastResultsResponse = await lastValueFrom(lastResultsSearchSource.fetch$());
      console.log({ lastResultsResponse });

      const timestampsActions = lastResultsResponse?.rawResponse?.aggregations?.actions.buckets;
      const test = getAggsByIds(ids, timestampsActions);
      console.log({ test });

      try {
        const aggsSearchSource = await kibanaData.search.searchSource.create({
          size: 1,
          aggs: test,
        });
        aggsSearchSource.setField('index', logsDataView);

        console.log({ aggsSearchSource });
        const aggsResponse = await aggsSearchSource.fetch$().toPromise();

        console.log({ aggsResponse222: aggsResponse });
      } catch (error) {
        console.log({ error });

        return null;
      }

      // aggsSearchSource.setField('index', logsDataView);
      // // aggsSearchSource.setField('aggs', {
      // //   unique_agents: { cardinality: { field: 'agent.id' } },
      // // });
      // const aggsResponse = await aggsSearchSource.fetch$().toPromise();

      // console.log({ aggs1RESPONSE: aggsResponse });

      return {
        '@timestamp': lastResultsResponse.rawResponse?.hits?.hits[0]?.fields?.['@timestamp'],
        // @ts-expect-error update types
        uniqueAgentsCount: aggsResponse.rawResponse.aggregations?.unique_agents?.value,
        // docCount: aggsResponse?.rawResponse?.hits?.total,
      };

      return null;
    },
    {
      keepPreviousData: true,
      enabled: !!(data.length && logsDataView),
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    }
  );
};

export const fetchLastResults = async ({
  kibanaData,
  data,
  packName,
  logsDataView,
}: ILastResultConfig): Promise<Record<string, ILastResult>> =>
  await data?.reduce(async (lastPromise: Promise<Record<string, any>>, item) => {
    const acc = await lastPromise;
    const actionId = getPackActionId(item.id, packName);

    const lastResultsSearchSource = await kibanaData.search.searchSource.create({
      size: 1,
      sort: [{ '@timestamp': SortDirection.desc }],
      query: {
        // @ts-expect-error update types
        bool: {
          filter: [
            {
              match_phrase: {
                action_id: actionId,
              },
            },
          ],
        },
      },
    });

    lastResultsSearchSource.setField('index', logsDataView);

    const lastResultsResponse = await lastValueFrom(lastResultsSearchSource.fetch$());
    const timestamp = lastResultsResponse.rawResponse?.hits?.hits[0]?.fields?.['@timestamp'][0];

    if (timestamp) {
      const aggsSearchSource = await kibanaData.search.searchSource.create({
        size: 1,
        query: {
          // @ts-expect-error update types
          bool: {
            filter: [
              {
                range: {
                  '@timestamp': {
                    gte: moment(timestamp).subtract(item.interval, 'seconds').format(),
                    lte: moment(timestamp).format(),
                  },
                },
              },
              {
                match_phrase: {
                  action_id: actionId,
                },
              },
            ],
          },
        },
      });

      aggsSearchSource.setField('index', logsDataView);
      aggsSearchSource.setField('aggs', {
        unique_agents: { cardinality: { field: 'agent.id' } },
      });
      const aggsResponse = await aggsSearchSource.fetch$().toPromise();
      console.log({ aggsResponse });

      return {
        ...acc,
        [item.id]: {
          '@timestamp': lastResultsResponse.rawResponse?.hits?.hits[0]?.fields?.['@timestamp'],
          // @ts-expect-error update types
          uniqueAgentsCount: aggsResponse.rawResponse.aggregations?.unique_agents?.value,
          docCount: aggsResponse?.rawResponse?.hits?.total as number,
        },
      };
    }

    return acc;
  }, Promise.resolve({}));

export const fetchLastResultsErrors = async ({
  kibanaData,
  data,
  packName,
  logsDataView,
}: ILastResultConfig): Promise<Record<string, ILastResultErrors>> =>
  await data?.reduce(async (lastPromise: Promise<Record<string, ILastResultErrors>>, item) => {
    const acc = await lastPromise;
    const actionId = getPackActionId(item.id, packName);

    const searchSource = await kibanaData.search.searchSource.create({
      fields: ['*'],
      sort: [
        {
          '@timestamp': SortDirection.desc,
        },
      ],
      query: {
        // @ts-expect-error update types
        bool: {
          filter: [
            {
              match_phrase: {
                message: 'Error',
              },
            },
            {
              match_phrase: {
                'data_stream.dataset': 'elastic_agent.osquerybeat',
              },
            },
            {
              match_phrase: {
                message: actionId,
              },
            },
            {
              range: {
                '@timestamp': {
                  gte: `now-${item.interval * 2}s`,
                  lte: 'now',
                },
              },
            },
          ],
        },
      },
      size: 1000,
    });

    searchSource.setField('index', logsDataView);
    const lastResponse = await lastValueFrom(searchSource.fetch$());

    return { ...acc, [item.id]: lastResponse.rawResponse?.hits };
  }, Promise.resolve({}));
