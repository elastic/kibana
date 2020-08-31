/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useRef } from 'react';
import { HttpSetup } from 'kibana/public';
import { ActionConnector } from '../../../../types';
import { getSeverity } from './api';

type Severity = Array<{ id: string; name: string }>;

interface Props {
  http: HttpSetup;
  actionConnector: ActionConnector;
}

export interface UseGetSeverity {
  severity: Severity;
  isLoading: boolean;
}

export const useGetSeverity = ({ http, actionConnector }: Props): UseGetSeverity => {
  const [isLoading, setIsLoading] = useState(true);
  const [severity, setSeverity] = useState<Severity>([]);
  const abortCtrl = useRef(new AbortController());

  useEffect(() => {
    let didCancel = false;
    const fetchData = async () => {
      abortCtrl.current = new AbortController();
      setIsLoading(true);

      const res = await getSeverity({
        http,
        signal: abortCtrl.current.signal,
        connectorId: actionConnector.id,
      });

      if (!didCancel) {
        setIsLoading(false);
        setSeverity(res.data ?? []);
      }
    };

    abortCtrl.current.abort();
    fetchData();

    return () => {
      didCancel = true;
      setIsLoading(false);
      abortCtrl.current.abort();
    };
  }, [http, actionConnector]);

  return {
    severity,
    isLoading,
  };
};
