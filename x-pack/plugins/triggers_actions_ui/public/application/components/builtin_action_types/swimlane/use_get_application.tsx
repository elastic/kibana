/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useCallback, useRef } from 'react';
import { HttpSetup, ToastsApi } from 'kibana/public';
import { getApplication as getApplicationApi } from './api';
import * as i18n from './translations';
import { SwimlaneActionConnector, SwimlaneFieldMappingConfig } from './types';

interface Props {
  http: HttpSetup;
  toastNotifications: Pick<
    ToastsApi,
    'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError'
  >;
  action: SwimlaneActionConnector;
}

export interface UseGetApplication {
  getApplication: () => Promise<{ fields: SwimlaneFieldMappingConfig[] } | undefined>;
  isLoading: boolean;
}

export const useGetApplication = ({
  http,
  action,
  toastNotifications,
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

      const response = await getApplicationApi({
        http,
        signal: abortCtrlRef.current.signal,
        connectorId: action.id,
      });

      if (!isCancelledRef.current) {
        setIsLoading(false);
        if (response.status && response.status === 'error') {
          toastNotifications.addDanger({
            title: i18n.SW_GET_APPLICATION_API_ERROR,
            text: `${response.serviceMessage ?? response.message}`,
          });
        } else {
          return response.data;
        }
      }
    } catch (error) {
      if (!isCancelledRef.current) {
        if (error.name !== 'AbortError') {
          toastNotifications.addDanger({
            title: i18n.SW_GET_APPLICATION_API_ERROR,
            text: error.message,
          });
        }
        setIsLoading(false);
      }
    }
  }, [action, http, toastNotifications]);

  return {
    isLoading,
    getApplication,
  };
};
