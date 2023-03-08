/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SetStateAction, useEffect, useState } from 'react';
import { HttpSetup } from '@kbn/core-http-browser';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/rule-registry-plugin/common';
import { isEmpty } from 'lodash';
import { useKibana } from '../utils/kibana_react';

export interface AlertsResponse {
  took: number;
  timeout: boolean;
}

export interface AlertsQueryParams {
  query: object;
  indexName?: string | null;
  featureIds: string[];
  skip?: boolean;
}
type Func = () => Promise<void>;
export interface AlertSearchResponse<Hit = {}, Aggregations = {} | undefined>
  extends AlertsResponse {
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  aggregations?: Aggregations;
  hits: {
    total: {
      value: number;
      relation: string;
    };
    max_score?: number | null;
    hits: Hit[];
  };
}

export interface ReturnQueryAlerts<Hit, Aggs> {
  loading: boolean;
  data: AlertSearchResponse<Hit, Aggs> | null;
  setQuery: React.Dispatch<SetStateAction<object>>;
  response: string;
  request: string;
  refetch: Func | null;
}

export interface BasicSignals {
  signal: AbortSignal;
}
export interface QueryAlerts extends BasicSignals {
  featureIds: string[];
  signal: AbortSignal;
  query: object;
  http: HttpSetup;
  index?: string | null;
}

export const fetchQueryAlertsOriginal = async <Hit, Aggregations>({
  query,
  signal,
  http,
}: QueryAlerts): Promise<AlertSearchResponse<Hit, Aggregations>> => {
  return http.fetch<AlertSearchResponse<Hit, Aggregations>>(BASE_RAC_ALERTS_API_PATH, {
    method: 'POST',
    body: JSON.stringify(query),
    signal,
  });
};

export const fetchQueryAlerts = async <Hit, Aggregations>({
  index,
  featureIds,
  query,
  signal,
  http,
}: QueryAlerts): Promise<AlertSearchResponse<Hit, Aggregations>> => {
  return http.fetch<AlertSearchResponse<Hit, Aggregations>>(`${BASE_RAC_ALERTS_API_PATH}/find`, {
    method: 'POST',
    body: JSON.stringify({ feature_ids: featureIds, index, ...query }),
    signal,
  });
};

export const useQueryAlerts = <Hit, Aggs>({
  featureIds,
  query: initialQuery,
  indexName,
  skip,
}: AlertsQueryParams): ReturnQueryAlerts<Hit, Aggs> => {
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
  const [loading, setLoading] = useState(false);
  const { http } = useKibana().services;
  const fetchAlerts = fetchQueryAlerts;

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);

        const { _source, runtime_mappings, ...rest } = query;
        const alertResponse = await fetchAlerts<Hit, Aggs>({
          index: indexName,
          featureIds,
          query: rest,
          signal: abortCtrl.signal,
          http,
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
    };

    if (!isEmpty(query) && !skip) {
      fetchData();
    }
    if (skip) {
      setLoading(false);
      isSubscribed = false;
      abortCtrl.abort();
    }

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [query, indexName, skip, fetchAlerts, http, featureIds]);

  return { loading, ...alerts };
};
