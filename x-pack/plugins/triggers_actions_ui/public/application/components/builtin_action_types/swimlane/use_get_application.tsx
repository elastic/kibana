/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useRef } from 'react';
import { ToastsApi } from '@kbn/core/public';
import { getApplication as getApplicationApi } from './api';
import * as i18n from './translations';
import { SwimlaneFieldMappingConfig } from './types';

interface Props {
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  appId: string;
  apiToken: string;
  apiUrl: string;
}

export interface UseGetApplication {
  getApplication: () => Promise<{ fields?: SwimlaneFieldMappingConfig[] } | undefined>;
  isLoading: boolean;
}

export const useGetApplication = ({
  toastNotifications,
  appId,
  apiToken,
  apiUrl,
}: Props): UseGetApplication => {
  const [isLoading, setIsLoading] = useState(false);
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());

  const getApplication = useCallback(async () => {
    try {
      isCancelledRef.current = false;
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      setIsLoading(true);

      const data = await getApplicationApi({
        signal: abortCtrlRef.current.signal,
        appId,
        apiToken,
        url: apiUrl,
      });

      if (!isCancelledRef.current) {
        setIsLoading(false);
        if (!data.fields) {
          // If the response was malformed and fields doesn't exist, show an error toast
          toastNotifications.addDanger({
            title: i18n.SW_GET_APPLICATION_API_ERROR(appId),
            text: i18n.SW_GET_APPLICATION_API_NO_FIELDS_ERROR,
          });
          return;
        }
        return data;
      }
    } catch (error) {
      if (!isCancelledRef.current) {
        if (error.name !== 'AbortError') {
          toastNotifications.addDanger({
            title: i18n.SW_GET_APPLICATION_API_ERROR(appId),
            text: error.message,
          });
        }
        setIsLoading(false);
      }
    }
  }, [apiToken, apiUrl, appId, toastNotifications]);

  return {
    isLoading,
    getApplication,
  };
};
