/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Unit } from '@elastic/datemath';

import { DataPublicPluginStart } from '../../../../../../../src/plugins/data/public';
import {
  EqlSearchStrategyRequest,
  EqlSearchStrategyResponse,
} from '../../../../../data_enhanced/common';
import { EQL_SEARCH_STRATEGY } from '../../../../../data_enhanced/public';
import {
  getValidationErrors,
  isErrorResponse,
  isValidationErrorResponse,
} from '../../../../common/search_strategy/eql';
import { getEqlAggsData, getSequenceAggs } from './helpers';
import { EqlPreviewResponse, Source } from './types';
import { hasEqlSequenceQuery } from '../../../../common/detection_engine/utils';
import { EqlSearchResponse } from '../../../../common/detection_engine/types';

interface Params {
  index: string[];
  query: string;
  data: DataPublicPluginStart;
  signal: AbortSignal;
}

export const validateEql = async ({
  data,
  index,
  query,
  signal,
}: Params): Promise<{ valid: boolean; errors: string[] }> => {
  const { rawResponse: response } = await data.search
    .search<EqlSearchStrategyRequest, EqlSearchStrategyResponse>(
      {
        // @ts-expect-error allow_no_indices is missing on EqlSearch
        params: { allow_no_indices: true, index: index.join(), body: { query, size: 0 } },
        options: { ignore: [400] },
      },
      {
        strategy: EQL_SEARCH_STRATEGY,
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

interface AggsParams {
  data: DataPublicPluginStart;
  index: string[];
  interval: Unit;
  fromTime: string;
  query: string;
  toTime: string;
  signal: AbortSignal;
}

export const getEqlPreview = async ({
  data,
  index,
  interval,
  query,
  fromTime,
  toTime,
  signal,
}: AggsParams): Promise<EqlPreviewResponse> => {
  try {
    const response = await data.search
      .search<EqlSearchStrategyRequest, EqlSearchStrategyResponse<EqlSearchResponse<Source>>>(
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
                    format: 'strict_date_optional_time',
                  },
                },
              },
              query,
              // EQL requires a cap, otherwise it defaults to 10
              // It also sorts on ascending order, capping it at
              // something smaller like 20, made it so that some of
              // the more recent events weren't returned
              size: 100,
            },
          },
        },
        {
          strategy: 'eql',
          abortSignal: signal,
        }
      )
      .toPromise();

    if (hasEqlSequenceQuery(query)) {
      return getSequenceAggs(response, interval, toTime, fromTime);
    } else {
      return getEqlAggsData(response, interval, toTime, fromTime);
    }
  } catch (err) {
    throw new Error(JSON.stringify(err));
  }
};
