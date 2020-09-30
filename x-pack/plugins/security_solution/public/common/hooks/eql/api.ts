/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';

import { HttpStart } from '../../../../../../../src/core/public';
import { DETECTION_ENGINE_EQL_VALIDATION_URL } from '../../../../common/constants';
import { EqlValidationSchema as EqlValidationRequest } from '../../../../common/detection_engine/schemas/request/eql_validation_schema';
import { EqlValidationSchema as EqlValidationResponse } from '../../../../common/detection_engine/schemas/response/eql_validation_schema';
import { DataPublicPluginStart } from '../../../../../../../src/plugins/data/public';
import {
  EqlSearchStrategyRequest,
  EqlSearchStrategyResponse,
} from '../../../../../data_enhanced/common';
import { InspectResponse } from '../../../types';
import { ChartData } from '../../components/charts/common';
import { getBucketRanges, getEqlAggsData, getInterval } from './helpers';

interface ApiParams {
  http: HttpStart;
  signal: AbortSignal;
}

export const validateEql = async ({
  http,
  query,
  index,
  signal,
}: ApiParams & EqlValidationRequest) => {
  return http.fetch<EqlValidationResponse>(DETECTION_ENGINE_EQL_VALIDATION_URL, {
    method: 'POST',
    body: JSON.stringify({
      query,
      index,
    }),
    signal,
  });
};

interface AggsParams extends EqlValidationRequest {
  data: DataPublicPluginStart;
  interval: string;
  fromTime: string;
  toTime: string;
  signal: AbortSignal;
}

export interface EqlAggsResponse {
  data: ChartData[];
  totalCount: number;
  lte: string;
  gte: string;
  inspect: InspectResponse;
}

export const getEqlPreview = async ({
  data,
  index,
  interval,
  query,
  fromTime,
  toTime,
  signal,
}: AggsParams): Promise<EqlAggsResponse> => {
  const { amount, intervalType } = getInterval(interval);
  const bucketRanges = getBucketRanges(moment(fromTime), moment(toTime), [], amount, intervalType);

  const inspectResponse = await data.search
    .search<EqlSearchStrategyRequest, EqlSearchStrategyResponse>(
      {
        params: {
          // @ts-expect-error allow_no_indices is missing on EqlSearch
          allow_no_indices: true,
          index: index.join(),
          body: {
            filter: {
              range: {
                '@timestamp': {
                  gte: toTime,
                  lte: fromTime,
                },
              },
            },
            query,
          },
        },
      },
      {
        strategy: 'eql',
        abortSignal: signal,
      }
    )
    .toPromise();

  // For the time being, EQL does not support aggs
  // this is a temporary workaround :/
  const responses = await Promise.allSettled(
    bucketRanges.map((bucket) =>
      data.search
        .search<EqlSearchStrategyRequest, EqlSearchStrategyResponse>(
          {
            params: {
              // @ts-expect-error allow_no_indices is missing on EqlSearch
              allow_no_indices: true,
              index: index.join(),
              body: {
                filter: {
                  range: {
                    '@timestamp': {
                      gte: bucket.gte,
                      lte: bucket.lte,
                    },
                  },
                },
                query,
              },
            },
          },
          {
            strategy: 'eql',
            abortSignal: signal,
          }
        )
        .toPromise()
    )
  );

  if (responses.every((r) => r.status === 'rejected')) {
    throw new Error('Unable to fetch query preview');
  } else {
    return getEqlAggsData(inspectResponse, responses, toTime, fromTime, bucketRanges);
  }
};
