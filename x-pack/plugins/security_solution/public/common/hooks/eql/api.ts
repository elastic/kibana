/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import moment from 'moment';
import { DataPublicPluginStart, IIndexPattern } from '../../../../../../../src/plugins/data/public';
import {
  EqlSearchStrategyRequest,
  EqlSearchStrategyResponse,
} from '../../../../../data_enhanced/common';
import { EqlValidationSchema as EqlValidationRequest } from '../../../../common/detection_engine/schemas/request/eql_validation_schema';
import { EqlValidationSchema as EqlValidationResponse } from '../../../../common/detection_engine/schemas/response/eql_validation_schema';
import {
  getValidationErrors,
  isErrorResponse,
  isValidationErrorResponse,
} from '../../../../common/search_strategy/eql';
import { ChartData } from '../../components/charts/common';
import { getBucketRanges, getEqlAggsData, getInterval } from './helpers';

interface Params extends EqlValidationRequest {
  data: DataPublicPluginStart;
  signal: AbortSignal;
}

export const validateEql = async ({
  data,
  index,
  query,
  signal,
}: Params): Promise<EqlValidationResponse> => {
  const { rawResponse: response } = await data.search
    .search<EqlSearchStrategyRequest, EqlSearchStrategyResponse>(
      {
        // @ts-expect-error allow_no_indices is missing on EqlSearch
        params: { allow_no_indices: true, index: index.join(), body: { query } },
        options: { ignore: [400] },
      },
      {
        strategy: 'eql',
        abortSignal: signal,
      }
    )
    .toPromise();

  if (isValidationErrorResponse(response.body)) {
    return { valid: false, errors: getValidationErrors(response.body) };
  } else if (isErrorResponse(response.body)) {
    throw new Error(JSON.stringify(response.body));
  } else {
    return { valid: true, errors: [] };
  }
};

interface AggsParams extends EqlValidationRequest {
  data: DataPublicPluginStart;
  indexPatterns: IIndexPattern;
  interval: string;
  from: string;
  to: string;
  signal: AbortSignal;
}

export interface EqlAggsResponse {
  data: ChartData[];
  total: number;
  lte: string;
  gte: string;
}

export const getEqlAggs = async ({
  data,
  index,
  interval,
  indexPatterns,
  query,
  from,
  to,
  signal,
}: AggsParams): Promise<EqlAggsResponse> => {
  const rangeFilter = data.query.timefilter.timefilter.createFilter(
    { ...indexPatterns, timeFieldName: '@timestamp' },
    { from, to }
  );

  if (rangeFilter == null) {
    throw new Error('Unable to create specified time filter');
  }

  const toTime = rangeFilter.range['@timestamp'].gte ?? from;
  const fromTime = rangeFilter.range['@timestamp'].lte ?? to;
  const { amount, intervalType } = getInterval(interval);
  const bucketRanges = getBucketRanges(moment(fromTime), moment(toTime), [], amount, intervalType);

  // For the time being, EQL does not support aggs
  // this is a temporary workaround :/
  const responses = await Promise.allSettled(
    bucketRanges.map((bucket) =>
      data.search
        .search<EqlSearchStrategyRequest, EqlSearchStrategyResponse>(
          {
            // @ts-expect-error allow_no_indices is missing on EqlSearch
            params: {
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

  if (responses.every((r) => isErrorResponse(r.body))) {
    throw new Error('Unable to fetch query preview');
  } else {
    return getEqlAggsData(responses, toTime, fromTime, bucketRanges);
  }
};
