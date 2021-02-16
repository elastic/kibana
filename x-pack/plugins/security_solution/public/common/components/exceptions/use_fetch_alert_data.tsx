/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { Ecs } from '../../../../common/ecs';
import { fetchQueryAlerts } from '../../../detections/containers/detection_engine/alerts/api';
import { AlertSearchResponse } from '../../../detections/containers/detection_engine/alerts/types';

import { buildGetAlertByIdQuery } from './helpers';
import { FlattenType } from './types';

type Func = () => Promise<void>;

interface ReturnQueryAlerts {
  loading: boolean;
  data: AlertSearchResponse<EcsHit> | null;
  response: string;
  request: string;
  refetch: Func | null;
}

interface EcsHit {
  _id: string;
  _index: string;
  _source: {
    '@timestamp': string;
  } & Omit<FlattenType<Ecs>, '_id' | '_index'>;
}

export type Alert = {
  '@timestamp': string;
} & FlattenType<Ecs>;

export const useFetchAlertData = (
  alertId?: string,
  indexName?: string | null
): ReturnQueryAlerts => {
  const [alert, setAlert] = useState<
    Pick<ReturnQueryAlerts, 'data' | 'response' | 'request' | 'refetch'>
  >({
    data: null,
    response: '',
    request: '',
    refetch: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const fetchData = async () => {
      try {
        setLoading(true);
        if (alertId == null) {
          setLoading(false);
          return;
        }
        const alertResponse = await fetchQueryAlerts<EcsHit, {}>({
          query: buildGetAlertByIdQuery(alertId),
          signal: abortCtrl.signal,
        });

        if (isSubscribed) {
          setAlert({
            data: alertResponse,
            response: JSON.stringify(alertResponse, null, 2),
            request: JSON.stringify(
              { index: [indexName] ?? [''], body: buildGetAlertByIdQuery(alertId) },
              null,
              2
            ),
            refetch: fetchData,
          });
        }
      } catch (error) {
        if (isSubscribed) {
          setAlert({
            data: null,
            response: '',
            request: '',
            refetch: fetchData,
          });
        }
      }
      if (isSubscribed) {
        setLoading(false);
      }
    };

    fetchData();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [alertId, indexName]);

  return { loading, ...alert };
};
