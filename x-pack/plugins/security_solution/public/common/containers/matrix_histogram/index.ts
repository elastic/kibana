/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { useEffect, useMemo, useState, useRef } from 'react';

import { DEFAULT_INDEX_KEY } from '../../../../common/constants';
import { MatrixHistogramQueryProps } from '../../components/matrix_histogram/types';
import { errorToToaster, useStateToaster } from '../../components/toasters';
import { useUiSetting$ } from '../../lib/kibana';
import { createFilter } from '../helpers';
import { useApolloClient } from '../../utils/apollo_context';
import { inputsModel } from '../../store';
import { MatrixHistogramGqlQuery } from './index.gql_query';
import { GetMatrixHistogramQuery, MatrixOverTimeHistogramData } from '../../../graphql/types';

export const useQuery = ({
  endDate,
  errorMessage,
  filterQuery,
  histogramType,
  indexToAdd,
  isInspected,
  stackByField,
  startDate,
}: MatrixHistogramQueryProps) => {
  const [configIndex] = useUiSetting$<string[]>(DEFAULT_INDEX_KEY);
  const defaultIndex = useMemo<string[]>(() => {
    if (indexToAdd != null && !isEmpty(indexToAdd)) {
      return [...configIndex, ...indexToAdd];
    }
    return configIndex;
  }, [configIndex, indexToAdd]);

  const [, dispatchToaster] = useStateToaster();
  const refetch = useRef<inputsModel.Refetch>();
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<MatrixOverTimeHistogramData[] | null>(null);
  const [inspect, setInspect] = useState<inputsModel.InspectQuery | null>(null);
  const [totalCount, setTotalCount] = useState<number>(-1);
  const apolloClient = useApolloClient();

  useEffect(() => {
    const matrixHistogramVariables: GetMatrixHistogramQuery.Variables = {
      filterQuery: createFilter(filterQuery),
      sourceId: 'default',
      timerange: {
        interval: '12h',
        from: startDate!,
        to: endDate!,
      },
      defaultIndex,
      inspect: isInspected,
      stackByField,
      histogramType,
    };
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    const abortSignal = abortCtrl.signal;

    async function fetchData() {
      if (!apolloClient) return null;
      setLoading(true);
      return apolloClient
        .query<GetMatrixHistogramQuery.Query, GetMatrixHistogramQuery.Variables>({
          query: MatrixHistogramGqlQuery,
          fetchPolicy: 'network-only',
          variables: matrixHistogramVariables,
          context: {
            fetchOptions: {
              abortSignal,
            },
          },
        })
        .then(
          (result) => {
            if (isSubscribed) {
              const source = result?.data?.source?.MatrixHistogram ?? {};
              setData(source?.matrixHistogramData ?? []);
              setTotalCount(source?.totalCount ?? -1);
              setInspect(source?.inspect ?? null);
              setLoading(false);
            }
          },
          (error) => {
            if (isSubscribed) {
              setData(null);
              setTotalCount(-1);
              setInspect(null);
              setLoading(false);
              errorToToaster({ title: errorMessage, error, dispatchToaster });
            }
          }
        );
    }
    refetch.current = fetchData;
    fetchData();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    defaultIndex,
    errorMessage,
    filterQuery,
    histogramType,
    indexToAdd,
    isInspected,
    stackByField,
    startDate,
    endDate,
    data,
  ]);

  return { data, loading, inspect, totalCount, refetch: refetch.current };
};
