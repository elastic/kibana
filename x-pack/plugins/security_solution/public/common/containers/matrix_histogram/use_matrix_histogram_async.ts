/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
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
  data: MatrixHistogramData[];
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
  signal,
}: GetMatrixHistogramProps): Promise<GetMatrixHistogramReturnArgs> => {
  const request = {
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
  };

  const response = await data.search
    .search<MatrixHistogramRequestOptions, MatrixHistogramStrategyResponse>(request, {
      strategy: 'securitySolutionSearchStrategy',
      abortSignal: signal,
    })
    .toPromise();

  if (isCompleteResponse(response)) {
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
