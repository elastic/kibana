/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { IKibanaSearchRequest } from '@kbn/data-plugin/common';
import { lastValueFrom } from 'rxjs';
import { extractErrorMessage } from '@kbn/ml-error-utils';
import type { SearchResponseBody } from '@elastic/elasticsearch/lib/api/types';
import { useMlKibana } from '../contexts/kibana';

export enum FETCH_STATUS {
  LOADING = 'loading',
  SUCCESS = 'success',
  FAILURE = 'failure',
  NOT_INITIATED = 'not_initiated',
}

export interface Result<T extends unknown> {
  status: FETCH_STATUS;
  data?: T;
  error?: string;
}

export const useDataSearch = () => {
  const {
    services: { data },
  } = useMlKibana();

  return useCallback(
    async (esSearchRequestParams: IKibanaSearchRequest['params'], abortSignal?: AbortSignal) => {
      try {
        const { rawResponse: resp } = await lastValueFrom(
          data.search.search(
            {
              params: esSearchRequestParams,
            },
            { abortSignal }
          )
        );

        return resp;
      } catch (error) {
        if (error.name === 'AbortError') {
          // ignore abort errors
        } else {
          return error;
        }
      }
    },
    [data]
  );
};

export const useFetchEsRequest = (esSearchRequestParams: IKibanaSearchRequest['params']) => {
  const dataSearch = useDataSearch();
  const [result, setResult] = useState<Result<SearchResponseBody>>({
    data: undefined,
    status: FETCH_STATUS.NOT_INITIATED,
    error: undefined,
  });

  useEffect(() => {
    let controller: AbortController = new AbortController();

    // Fetch 500 random documents to determine populated fields.
    // This is a workaround to avoid passing potentially thousands of unpopulated fields
    // (for example, as part of filebeat/metricbeat/ECS based indices)
    // to the data grid component which would significantly slow down the page.
    const doFetchEsRequest = async function () {
      controller.abort();

      controller = new AbortController();

      const signal = controller.signal;

      setResult({ data: undefined, status: FETCH_STATUS.LOADING, error: undefined });

      try {
        const resp = await dataSearch(esSearchRequestParams, signal);
        console.log('--@@resp', resp);

        setResult({
          // @todo: do some extra processing to 'resp' if needed
          data: resp,
          status: FETCH_STATUS.FAILURE,
          error: extractErrorMessage(resp),
        });
      } catch (e) {
        setResult({
          data: undefined,
          status: FETCH_STATUS.FAILURE,
          error: extractErrorMessage(e),
        });
      }
    };

    doFetchEsRequest();

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return result;
};
