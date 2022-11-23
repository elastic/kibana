/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { getOr, noop } from 'lodash/fp';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Subscription } from 'rxjs';

import { isErrorResponse, isCompleteResponse } from '@kbn/data-plugin/common';
import type { MatrixHistogramQueryProps } from '../../components/matrix_histogram/types';
import type { inputsModel } from '../../store';
import { createFilter } from '../helpers';
import { useKibana } from '../../lib/kibana';
import type {
  MatrixHistogramRequestOptions,
  MatrixHistogramStrategyResponse,
  MatrixHistogramData,
} from '../../../../common/search_strategy/security_solution';
import {
  MatrixHistogramQuery,
  MatrixHistogramTypeToAggName,
} from '../../../../common/search_strategy/security_solution';
import { getInspectResponse } from '../../../helpers';
import type { InspectResponse } from '../../../types';
import * as i18n from './translations';
import { useAppToasts } from '../../hooks/use_app_toasts';
import { useTrackHttpRequest } from '../../lib/apm/use_track_http_request';
import { APP_UI_ID } from '../../../../common/constants';

export type Buckets = Array<{
  key: string;
  doc_count: number;
}>;

const bucketEmpty: Buckets = [];

export interface UseMatrixHistogramArgs {
  data: MatrixHistogramData[];
  inspect: InspectResponse;
  refetch: inputsModel.Refetch;
  totalCount: number;
  buckets: Array<{
    key: string;
    doc_count: number;
  }>;
}

export const useMatrixHistogram = ({
  endDate,
  errorMessage,
  filterQuery,
  histogramType,
  indexNames,
  isPtrIncluded,
  onError,
  stackByField,
  runtimeMappings,
  startDate,
  threshold,
  skip = false,
  includeMissingData = true,
}: MatrixHistogramQueryProps): [
  boolean,
  UseMatrixHistogramArgs,
  (to: string, from: string) => void
] => {
  const { data } = useKibana().services;
  const refetch = useRef<inputsModel.Refetch>(noop);
  const abortCtrl = useRef(new AbortController());
  const searchSubscription$ = useRef(new Subscription());
  const [loading, setLoading] = useState(false);
  const { startTracking } = useTrackHttpRequest();

  const [matrixHistogramRequest, setMatrixHistogramRequest] =
    useState<MatrixHistogramRequestOptions>({
      defaultIndex: indexNames,
      factoryQueryType: MatrixHistogramQuery,
      filterQuery: createFilter(filterQuery),
      histogramType: histogramType ?? histogramType,
      timerange: {
        interval: '12h',
        from: startDate,
        to: endDate,
      },
      stackByField,
      runtimeMappings,
      threshold,
      ...(isPtrIncluded != null ? { isPtrIncluded } : {}),
      ...(includeMissingData != null ? { includeMissingData } : {}),
    });
  const { addError, addWarning } = useAppToasts();

  const [matrixHistogramResponse, setMatrixHistogramResponse] = useState<UseMatrixHistogramArgs>({
    data: [],
    inspect: {
      dsl: [],
      response: [],
    },
    refetch: refetch.current,
    totalCount: -1,
    buckets: [],
  });

  const search = useCallback(
    (request: MatrixHistogramRequestOptions) => {
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);
        const { endTracking } = startTracking({
          name: `${APP_UI_ID} matrixHistogram ${histogramType}`,
        });

        searchSubscription$.current = data.search
          .search<MatrixHistogramRequestOptions, MatrixHistogramStrategyResponse>(request, {
            strategy: 'securitySolutionSearchStrategy',
            abortSignal: abortCtrl.current.signal,
          })
          .subscribe({
            next: (response) => {
              if (isCompleteResponse(response)) {
                const histogramBuckets: Buckets = getOr(
                  bucketEmpty,
                  MatrixHistogramTypeToAggName[histogramType],
                  response.rawResponse
                );
                setLoading(false);
                setMatrixHistogramResponse((prevResponse) => ({
                  ...prevResponse,
                  data: response.matrixHistogramData,
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  refetch: refetch.current,
                  totalCount: histogramBuckets.reduce((acc, bucket) => bucket.doc_count + acc, 0),
                  buckets: histogramBuckets,
                }));
                endTracking('success');
                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_MATRIX_HISTOGRAM);
                endTracking('invalid');
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: errorMessage ?? i18n.FAIL_MATRIX_HISTOGRAM,
              });
              endTracking('error');
              searchSubscription$.current.unsubscribe();
            },
          });
      };
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
    },
    [data.search, histogramType, addWarning, addError, errorMessage, startTracking]
  );

  useEffect(() => {
    setMatrixHistogramRequest((prevRequest) => {
      const myRequest = {
        ...prevRequest,
        defaultIndex: indexNames,
        filterQuery: createFilter(filterQuery),
        histogramType,
        timerange: {
          interval: '12h',
          from: startDate,
          to: endDate,
        },
        stackByField,
        threshold,
        ...(isPtrIncluded != null ? { isPtrIncluded } : {}),
      };
      if (!deepEqual(prevRequest, myRequest)) {
        return myRequest;
      }
      return prevRequest;
    });
  }, [
    indexNames,
    endDate,
    filterQuery,
    startDate,
    stackByField,
    histogramType,
    threshold,
    isPtrIncluded,
  ]);

  useEffect(() => {
    // We want to search if it is not skipped, stackByField ends with ip and include missing data
    if (!skip) {
      search(matrixHistogramRequest);
    }
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [matrixHistogramRequest, search, skip]);

  useEffect(() => {
    if (skip) {
      setLoading(false);
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    }
  }, [skip]);

  const runMatrixHistogramSearch = useCallback(
    (to: string, from: string) => {
      search({
        ...matrixHistogramRequest,
        timerange: {
          interval: '12h',
          from,
          to,
        },
      });
    },
    [matrixHistogramRequest, search]
  );

  return [loading, matrixHistogramResponse, runMatrixHistogramSearch];
};

/* function needed to split ip histogram data requests due to elasticsearch bug https://github.com/elastic/kibana/issues/89205
 * using includeMissingData parameter to do the "missing data" query separately
 **/
export const useMatrixHistogramCombined = (
  matrixHistogramQueryProps: MatrixHistogramQueryProps
): [boolean, UseMatrixHistogramArgs] => {
  const [mainLoading, mainResponse] = useMatrixHistogram({
    ...matrixHistogramQueryProps,
    includeMissingData: true,
  });

  const skipMissingData = useMemo(
    () => !matrixHistogramQueryProps.stackByField.endsWith('.ip'),
    [matrixHistogramQueryProps.stackByField]
  );
  const [missingDataLoading, missingDataResponse] = useMatrixHistogram({
    ...matrixHistogramQueryProps,
    includeMissingData: false,
    skip: skipMissingData || matrixHistogramQueryProps.filterQuery === undefined,
  });

  const combinedLoading = useMemo<boolean>(
    () => mainLoading || missingDataLoading,
    [mainLoading, missingDataLoading]
  );

  const combinedResponse = useMemo<UseMatrixHistogramArgs>(() => {
    if (skipMissingData) return mainResponse;

    const { data, inspect, totalCount, refetch, buckets } = mainResponse;
    const {
      data: extraData,
      inspect: extraInspect,
      totalCount: extraTotalCount,
      refetch: extraRefetch,
    } = missingDataResponse;

    const combinedRefetch = () => {
      refetch();
      extraRefetch();
    };

    if (combinedLoading) {
      return {
        data: [],
        inspect: {
          dsl: [],
          response: [],
        },
        refetch: combinedRefetch,
        totalCount: -1,
        buckets: [],
      };
    }

    return {
      data: [...data, ...extraData],
      inspect: {
        dsl: [...inspect.dsl, ...extraInspect.dsl],
        response: [...inspect.response, ...extraInspect.response],
      },
      totalCount: totalCount + extraTotalCount,
      refetch: combinedRefetch,
      buckets,
    };
  }, [combinedLoading, mainResponse, missingDataResponse, skipMissingData]);

  return [combinedLoading, combinedResponse];
};
