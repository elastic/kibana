/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useRef } from 'react';
import { HttpSetup, ToastsApi } from 'kibana/public';
import { getSeverity } from './api';
import * as i18n from './translations';
import { ActionConnector } from '../../../containers/types';

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

  useEffect(() => {
    let didCancel = false;
    const fetchData = async () => {
      if (!connector) {
        setIsLoading(false);
        return;
      }

      abortCtrl.current = new AbortController();
      setIsLoading(true);

      try {
        const res = await getSeverity({
          http,
          signal: abortCtrl.current.signal,
          connectorId: connector.id,
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
  }, [http, connector, toastNotifications]);

  return {
    severity,
    isLoading,
  };
};
