/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef } from 'react';
import { HttpSetup, ToastsApi } from '@kbn/core/public';
import { ActionConnector } from '../../../../types';
import { getSeverity } from './api';
import * as i18n from './translations';

type Severity = Array<{ id: number; name: string }>;

interface Props {
  http: HttpSetup;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  actionConnector?: ActionConnector;
}

export interface UseGetSeverity {
  severity: Severity;
  isLoading: boolean;
}

export const useGetSeverity = ({
  http,
  toastNotifications,
  actionConnector,
}: Props): UseGetSeverity => {
  const [isLoading, setIsLoading] = useState(true);
  const [severity, setSeverity] = useState<Severity>([]);
  const abortCtrl = useRef(new AbortController());

  useEffect(() => {
    let didCancel = false;
    const fetchData = async () => {
      if (!actionConnector) {
        setIsLoading(false);
        return;
      }

      abortCtrl.current = new AbortController();
      setIsLoading(true);

      try {
        const res = await getSeverity({
          http,
          signal: abortCtrl.current.signal,
          connectorId: actionConnector.id,
        });

        if (!didCancel) {
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
        if (!didCancel) {
          setIsLoading(false);
          toastNotifications.addDanger({
            title: i18n.SEVERITY_API_ERROR,
            text: error.message,
          });
        }
      }
    };

    abortCtrl.current.abort();
    fetchData();

    return () => {
      didCancel = true;
      setIsLoading(false);
      abortCtrl.current.abort();
    };
  }, [http, actionConnector, toastNotifications]);

  return {
    severity,
    isLoading,
  };
};
