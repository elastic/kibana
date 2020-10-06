/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getOr } from 'lodash/fp';

import { useAsync, withOptionalSignal } from '../../../shared_imports';
import { DataPublicPluginStart } from '../../../../../../../src/plugins/data/public';
import { MatrixHistogramQueryProps } from '../../components/matrix_histogram/types';
import { createFilter } from '../../../common/containers/helpers';
import {
  MatrixHistogramQuery,
  MatrixHistogramRequestOptions,
  MatrixHistogramStrategyResponse,
  MatrixHistogramData,
} from '../../../../common/search_strategy/security_solution';
import { isErrorResponse, isCompleteResponse } from '../../../../../../../src/plugins/data/common';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';

export interface GetMatrixHistogramProps extends Omit<MatrixHistogramQueryProps, 'errorMessage'> {
  data: DataPublicPluginStart;
  signal: AbortSignal;
}

export interface GetMatrixHistogramReturnArgs {
  data: MatrixHistogramData[] | Array<{ x: string; y: number; g: string }>;
  inspect: InspectResponse;
  totalCount: number;
}

export const getMatrixHistorgram = async ({
  data,
  endDate,
  filterQuery,
  histogramType,
  indexNames,
  stackByField,
  startDate,
  threshold,
  signal,
}: GetMatrixHistogramProps): Promise<GetMatrixHistogramReturnArgs> => {
  const request: MatrixHistogramRequestOptions = {
    defaultIndex: indexNames,
    factoryQueryType: MatrixHistogramQuery,
    filterQuery: createFilter(filterQuery),
    histogramType,
    timerange: {
      interval: '12h',
      from: startDate,
      to: endDate,
    },
    stackByField,
    threshold,
  };

  const response = await data.search
    .search<MatrixHistogramRequestOptions, MatrixHistogramStrategyResponse>(request, {
      strategy: 'securitySolutionSearchStrategy',
      abortSignal: signal,
    })
    .toPromise();

  if (isCompleteResponse(response)) {
    if (threshold != null && threshold.field != null) {
      const buckets: Array<{
        key: string;
        doc_count: number;
      }> = getOr([], 'rawResponse.aggregations.eventActionGroup.buckets', response);
      return {
        data: buckets.map<{ x: string; y: number; g: string }>(({ key, doc_count: docCount }) => ({
          x: key,
          y: docCount,
          g: key,
        })),
        inspect: getInspectResponse(response, { dsl: [], response: [] }),
        totalCount: buckets.length,
      };
    }
    return {
      data: response.matrixHistogramData,
      inspect: getInspectResponse(response, { dsl: [], response: [] }),
      totalCount: response.totalCount,
    };
  } else if (isErrorResponse(response)) {
    throw new Error(JSON.stringify(response));
  } else {
    return {
      data: [],
      inspect: { dsl: [], response: [] },
      totalCount: 0,
    };
  }
};

const getMatrixHistogramWithOptionalSignal = withOptionalSignal(getMatrixHistorgram);

export const useMatrixHistogramAsync = () => useAsync(getMatrixHistogramWithOptionalSignal);
