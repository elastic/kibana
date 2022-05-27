/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { useState, useEffect, useRef, useCallback } from 'react';
import { HttpStart } from '@kbn/core/public';
import { getAppInfo } from './api';
import { AppInfo, RESTApiError, ServiceNowActionConnector } from './types';

export interface UseGetAppInfoProps {
  actionTypeId?: string;
  http: HttpStart;
}

export interface UseGetAppInfo {
  fetchAppInfo: (
    connector: ServiceNowActionConnector
  ) => Promise<AppInfo | RESTApiError | undefined>;
  isLoading: boolean;
}

export const useGetAppInfo = ({ actionTypeId, http }: UseGetAppInfoProps): UseGetAppInfo => {
  const [isLoading, setIsLoading] = useState(false);
  const didCancel = useRef(false);
  const abortCtrl = useRef(new AbortController());

  const fetchAppInfo = useCallback(
    async (connector) => {
      try {
        if (!actionTypeId || isEmpty(actionTypeId)) {
          return;
        }

        didCancel.current = false;
        abortCtrl.current.abort();
        abortCtrl.current = new AbortController();
        setIsLoading(true);

        const res = await getAppInfo({
          signal: abortCtrl.current.signal,
          connector,
          actionTypeId,
          http,
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
    [actionTypeId, http]
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
