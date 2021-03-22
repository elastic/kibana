/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { useStateToaster, errorToToaster } from '../../../common/components/toasters';
import * as i18n from '../translations';
import { fetchConnectors } from './api';
import { ActionConnector } from './types';

export interface UseConnectorsResponse {
  loading: boolean;
  connectors: ActionConnector[];
  refetchConnectors: () => void;
}

export const useConnectors = (): UseConnectorsResponse => {
  const [, dispatchToaster] = useStateToaster();
  const [loading, setLoading] = useState(true);
  const [connectors, setConnectors] = useState<ActionConnector[]>([]);
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());

  const refetchConnectors = useCallback(async () => {
    try {
      isCancelledRef.current = false;
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();

      setLoading(true);
      const res = await fetchConnectors({ signal: abortCtrlRef.current.signal });

      if (!isCancelledRef.current) {
        setLoading(false);
        setConnectors(res);
      }
    } catch (error) {
      if (!isCancelledRef.current) {
        if (error.name !== 'AbortError') {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
        }

        setLoading(false);
        setConnectors([]);
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
    loading,
    connectors,
    refetchConnectors,
  };
};
