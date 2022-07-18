/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef } from 'react';
import { HttpSetup, ToastsApi } from '@kbn/core/public';
import { ActionConnector } from '../../../../common/api';
import { getSeverity } from './api';
import * as i18n from './translations';

type Severity = Array<{ id: number; name: string }>;

interface Props {
  http: HttpSetup;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  connector?: ActionConnector;
}

export interface UseGetSeverity {
  severity: Severity;
  isLoading: boolean;
}

export const useGetSeverity = ({ http, toastNotifications, connector }: Props): UseGetSeverity => {
  const [isLoading, setIsLoading] = useState(true);
  const [severity, setSeverity] = useState<Severity>([]);
  const abortCtrl = useRef(new AbortController());
  const didCancel = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!connector) {
        setIsLoading(false);
        return;
      }

      try {
        abortCtrl.current = new AbortController();
        setIsLoading(true);

        const res = await getSeverity({
          http,
          signal: abortCtrl.current.signal,
          connectorId: connector.id,
        });

        if (!didCancel.current) {
          setIsLoading(false);
          setSeverity(res.data ?? []);

          if (res.status && res.status === 'error') {
            toastNotifications.addDanger({
              title: i18n.SEVERITY_API_ERROR,
              text: `${res.serviceMessage ?? res.message}`,
            });
          }
        }
      } catch (error) {
        if (!didCancel.current) {
          setIsLoading(false);
          if (error.name !== 'AbortError') {
            toastNotifications.addDanger({
              title: i18n.SEVERITY_API_ERROR,
              text: error.message,
            });
          }
        }
      }
    };

    didCancel.current = false;
    abortCtrl.current.abort();
    fetchData();

    return () => {
      didCancel.current = true;
      abortCtrl.current.abort();
    };
  }, [http, connector, toastNotifications]);

  return {
    severity,
    isLoading,
  };
};
