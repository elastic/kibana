/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { ToastsApi } from 'kibana/public';
import { getAppInfo } from './api';
import { AppInfo, RESTApiError, ServiceNowActionConnector } from './types';
import * as i18n from './translations';

export interface UseGetChoicesProps {
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
}

export interface UseGetChoices {
  fetchAppInfo: (connector: ServiceNowActionConnector) => Promise<AppInfo | RESTApiError>;
  isLoading: boolean;
}

export const useGetAppInfo = ({ toastNotifications }: UseGetChoicesProps): UseGetChoices => {
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
        });

        if (!didCancel.current) {
          setIsLoading(false);
        }

        return res;
      } catch (error) {
        if (!didCancel.current) {
          setIsLoading(false);
        }
        toastNotifications.addDanger({
          title: i18n.APP_INFO_API_ERROR,
          text: error.message,
        });
        throw error;
      }
    },
    [toastNotifications]
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
