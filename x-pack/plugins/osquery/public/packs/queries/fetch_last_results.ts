/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lastValueFrom } from 'rxjs';

import { DataView, SortDirection } from '@kbn/data-plugin/common';

import { PackSOFormData } from './use_pack_query_form';

const getPackActionId = (actionId: string, packName: string) => `pack_${packName}_${actionId}`;

interface ILastResultConfig {
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

export const useFetchLastResultsErrors = async ({
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
