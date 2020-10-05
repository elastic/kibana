/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Unit } from '@elastic/datemath';

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
import { getEqlAggsData, getSequenceAggs } from './helpers';

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
  interval: Unit;
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
  try {
    const response = await data.search
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
              size: 50,
            },
          },
        },
        {
          strategy: 'eql',
          abortSignal: signal,
        }
      )
      .toPromise();

    if (query.indexOf('sequence') !== -1) {
      return getSequenceAggs(response, toTime, fromTime);
    } else {
      return getEqlAggsData(response, interval, toTime, fromTime);
    }
  } catch (err) {
    throw new Error(JSON.stringify(err));
  }
};
