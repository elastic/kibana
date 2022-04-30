/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAppInfo } from './api';
import { AppInfo, RESTApiError, ServiceNowActionConnector } from './types';

export interface UseGetAppInfoProps {
  actionTypeId: string;
}

export interface UseGetAppInfo {
  fetchAppInfo: (connector: ServiceNowActionConnector) => Promise<AppInfo | RESTApiError>;
  isLoading: boolean;
}

export const useGetAppInfo = ({ actionTypeId }: UseGetAppInfoProps): UseGetAppInfo => {
  const [isLoading, setIsLoading] = useState(false);
  const didCancel = useRef(false);
  const abortCtrl = useRef(new AbortController());

  const fetchAppInfo = useCallback(
    async (connector) => {
      try {
        didCancel.current = false;
        abortCtrl.current.abort();
        abortCtrl.current = new AbortController();
        setIsLoading(true);

        const res = await getAppInfo({
          signal: abortCtrl.current.signal,
          apiUrl: connector.config.apiUrl,
          username: connector.secrets.username,
          password: connector.secrets.password,
          actionTypeId,
        });

        if (!didCancel.current) {
          setIsLoading(false);
        }

        return res;
      } catch (error) {
        if (!didCancel.current) {
          setIsLoading(false);
        }
        throw error;
      }
    },
    [actionTypeId]
  );

  useEffect(() => {
    return () => {
      didCancel.current = true;
      abortCtrl.current.abort();
      setIsLoading(false);
    };
  }, []);

  return {
    fetchAppInfo,
    isLoading,
  };
};
