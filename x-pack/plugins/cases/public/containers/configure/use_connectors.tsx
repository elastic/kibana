/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { fetchConnectors } from './api';
import { ActionConnector } from './types';
import { useToasts } from '../../common/lib/kibana';
import * as i18n from './translations';

interface ConnectorsState {
  loading: boolean;
  connectors: ActionConnector[];
  permissionsError?: string;
}

export interface UseConnectorsResponse {
  loading: boolean;
  connectors: ActionConnector[];
  refetchConnectors: () => void;
  permissionsError?: string;
}

/**
 * Retrieves the configured case connectors
 *
 * @param toastPermissionsErrors boolean controlling whether 403 and 401 errors should be displayed in a toast error
 */
export const useConnectors = ({
  toastPermissionsErrors = true,
}: {
  toastPermissionsErrors?: boolean;
} = {}): UseConnectorsResponse => {
  const toasts = useToasts();
  const [state, setState] = useState<ConnectorsState>({
    loading: true,
    connectors: [],
  });

  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());

  const refetchConnectors = useCallback(async () => {
    try {
      isCancelledRef.current = false;
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      setState({
        ...state,
        loading: true,
      });
      const res = await fetchConnectors({ signal: abortCtrlRef.current.signal });

      if (!isCancelledRef.current) {
        setState({
          loading: false,
          connectors: res,
        });
      }
    } catch (error) {
      if (!isCancelledRef.current) {
        let permissionsError: string | undefined;
        if (error.name !== 'AbortError') {
          // if the error was related to permissions then let's return a boilerplate error message describing the problem
          if (error.body?.statusCode === 403 || error.body?.statusCode === 401) {
            permissionsError = i18n.READ_PERMISSIONS_ERROR_MSG;
          }

          // if the error was not permissions related then toast it
          // if it was permissions related (permissionsError was defined) and the caller wants to toast, then create a toast
          if (permissionsError === undefined || toastPermissionsErrors) {
            toasts.addError(
              error.body && error.body.message ? new Error(error.body.message) : error,
              { title: i18n.ERROR_TITLE }
            );
          }
        }
        setState({
          loading: false,
          connectors: [],
          permissionsError,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refetchConnectors();
    return () => {
      isCancelledRef.current = true;
      abortCtrlRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    loading: state.loading,
    connectors: state.connectors,
    refetchConnectors,
    permissionsError: state.permissionsError,
  };
};
