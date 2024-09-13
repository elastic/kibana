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
import { FETCH_ERROR } from './translations';

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
    async (connector: ServiceNowActionConnector) => {
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

        /**
         * According to https://developer.mozilla.org/en-US/docs/Web/API/fetch#exceptions
         * all network errors throw a TypeError. Usually fetch errors are happening
         * due to CORS misconfiguration. By detecting fetch errors we can provide
         * a better message about CORS. Adding a CORS rule to allow requests from the UI
         * in the ServiceNow instance is needed by our ServiceNow applications.
         */
        if (error.name === 'TypeError') {
          throw new Error(FETCH_ERROR);
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
