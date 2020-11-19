/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SetStateAction, useEffect, useState } from 'react';

import { fetchQueryAlerts } from './api';
import { AlertSearchResponse } from './types';

type Func = () => void;

export interface ReturnQueryAlerts<Hit, Aggs> {
  loading: boolean;
  data: AlertSearchResponse<Hit, Aggs> | null;
  setQuery: React.Dispatch<SetStateAction<object>>;
  response: string;
  request: string;
  refetch: Func | null;
}

/**
 * Hook for fetching Alerts from the Detection Engine API
 *
 * @param initialQuery query dsl object
 *
 */
export const useQueryAlerts = <Hit, Aggs>(
  initialQuery: object,
  indexName?: string | null
): ReturnQueryAlerts<Hit, Aggs> => {
  const [query, setQuery] = useState(initialQuery);
  const [alerts, setAlerts] = useState<
    Pick<ReturnQueryAlerts<Hit, Aggs>, 'data' | 'setQuery' | 'response' | 'request' | 'refetch'>
  >({
    data: null,
    response: '',
    request: '',
    setQuery,
    refetch: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    async function fetchData() {
      try {
        setLoading(true);
        const alertResponse = await fetchQueryAlerts<Hit, Aggs>({
          query,
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setAlerts({
            data: alertResponse,
            response: JSON.stringify(alertResponse, null, 2),
            request: JSON.stringify({ index: [indexName] ?? [''], body: query }, null, 2),
            setQuery,
            refetch: fetchData,
          });
        }
      } catch (error) {
        if (isSubscribed) {
          setAlerts({
            data: null,
            response: '',
            request: '',
            setQuery,
            refetch: fetchData,
          });
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    }

    fetchData();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [query, indexName]);

  return { loading, ...alerts };
};
