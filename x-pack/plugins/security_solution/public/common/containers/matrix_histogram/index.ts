/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import deepEqual from 'fast-deep-equal';
import { getOr, isEmpty, noop } from 'lodash/fp';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Subscription } from 'rxjs';

import { MatrixHistogramQueryProps } from '../../components/matrix_histogram/types';
import { inputsModel } from '../../../common/store';
import { createFilter } from '../../../common/containers/helpers';
import { useKibana } from '../../../common/lib/kibana';
import {
  MatrixHistogramQuery,
  MatrixHistogramRequestOptions,
  MatrixHistogramStrategyResponse,
  MatrixHistogramData,
} from '../../../../common/search_strategy/security_solution';
import { isErrorResponse, isCompleteResponse } from '../../../../../../../src/plugins/data/common';
import { getInspectResponse } from '../../../helpers';
import { InspectResponse } from '../../../types';
import * as i18n from './translations';
import { useTransforms } from '../../../transforms/containers/use_transforms';
import { useAppToasts } from '../../hooks/use_app_toasts';

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
  docValueFields,
  endDate,
  errorMessage,
  filterQuery,
  histogramType,
  indexNames,
  isPtrIncluded,
  stackByField,
  startDate,
  threshold,
  skip = false,
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
  const { getTransformChangesIfTheyExist } = useTransforms();

  const {
    indices: initialIndexName,
    factoryQueryType: initialFactoryQueryType,
    histogramType: initialHistogramType,
    timerange: initialTimerange,
  } = getTransformChangesIfTheyExist({
    histogramType,
    factoryQueryType: MatrixHistogramQuery,
    indices: indexNames,
    filterQuery,
    timerange: {
      interval: '12h',
      from: startDate,
      to: endDate,
    },
  });

  const [
    matrixHistogramRequest,
    setMatrixHistogramRequest,
  ] = useState<MatrixHistogramRequestOptions>({
    defaultIndex: initialIndexName,
    factoryQueryType: initialFactoryQueryType,
    filterQuery: createFilter(filterQuery),
    histogramType: initialHistogramType ?? histogramType,
    timerange: initialTimerange,
    stackByField,
    threshold,
    ...(isPtrIncluded != null ? { isPtrIncluded } : {}),
    ...(!isEmpty(docValueFields) ? { docValueFields } : {}),
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

  const hostsSearch = useCallback(
    (request: MatrixHistogramRequestOptions) => {
      const asyncSearch = async () => {
        abortCtrl.current = new AbortController();
        setLoading(true);

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
                  'rawResponse.aggregations.eventActionGroup.buckets',
                  response
                );
                setLoading(false);
                setMatrixHistogramResponse((prevResponse) => ({
                  ...prevResponse,
                  data: response.matrixHistogramData,
                  inspect: getInspectResponse(response, prevResponse.inspect),
                  refetch: refetch.current,
                  totalCount: response.totalCount,
                  buckets: histogramBuckets,
                }));
                searchSubscription$.current.unsubscribe();
              } else if (isErrorResponse(response)) {
                setLoading(false);
                addWarning(i18n.ERROR_MATRIX_HISTOGRAM);
                searchSubscription$.current.unsubscribe();
              }
            },
            error: (msg) => {
              setLoading(false);
              addError(msg, {
                title: errorMessage ?? i18n.FAIL_MATRIX_HISTOGRAM,
              });
              searchSubscription$.current.unsubscribe();
            },
          });
      };
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
      asyncSearch();
      refetch.current = asyncSearch;
    },
    [data.search, errorMessage, addError, addWarning]
  );

  useEffect(() => {
    const {
      indices,
      factoryQueryType,
      histogramType: newHistogramType,
      timerange,
    } = getTransformChangesIfTheyExist({
      histogramType,
      factoryQueryType: MatrixHistogramQuery,
      indices: indexNames,
      filterQuery,
      timerange: {
        interval: '12h',
        from: startDate,
        to: endDate,
      },
    });

    setMatrixHistogramRequest((prevRequest) => {
      const myRequest = {
        ...prevRequest,
        defaultIndex: indices,
        factoryQueryType,
        filterQuery: createFilter(filterQuery),
        histogramType: newHistogramType ?? histogramType,
        timerange,
        stackByField,
        threshold,
        ...(isPtrIncluded != null ? { isPtrIncluded } : {}),
        ...(!isEmpty(docValueFields) ? { docValueFields } : {}),
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
    docValueFields,
    getTransformChangesIfTheyExist,
  ]);

  useEffect(() => {
    if (!skip) {
      hostsSearch(matrixHistogramRequest);
    }
    return () => {
      searchSubscription$.current.unsubscribe();
      abortCtrl.current.abort();
    };
  }, [matrixHistogramRequest, hostsSearch, skip]);

  const runMatrixHistogramSearch = useCallback(
    (to: string, from: string) => {
      hostsSearch({
        ...matrixHistogramRequest,
        timerange: {
          interval: '12h',
          from,
          to,
        },
      });
    },
    [matrixHistogramRequest, hostsSearch]
  );

  return [loading, matrixHistogramResponse, runMatrixHistogramSearch];
};
