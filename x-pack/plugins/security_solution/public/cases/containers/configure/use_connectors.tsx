/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useCallback } from 'react';

import { useStateToaster, errorToToaster } from '../../../common/components/toasters';
import * as i18n from '../translations';
import { fetchConnectors } from './api';
import { Connector } from './types';

export interface ReturnConnectors {
  loading: boolean;
  connectors: Connector[];
  refetchConnectors: () => void;
}

export const useConnectors = (): ReturnConnectors => {
  const [, dispatchToaster] = useStateToaster();
  const [loading, setLoading] = useState(true);
  const [connectors, setConnectors] = useState<Connector[]>([]);

  const refetchConnectors = useCallback(() => {
    let didCancel = false;
    const abortCtrl = new AbortController();
    const getConnectors = async () => {
      try {
        setLoading(true);
        const res = await fetchConnectors({ signal: abortCtrl.signal });
        if (!didCancel) {
          setLoading(false);
          setConnectors(res);
        }
      } catch (error) {
        if (!didCancel) {
          setLoading(false);
          setConnectors([]);
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
        }
      }
    };
    getConnectors();
    return () => {
      didCancel = true;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refetchConnectors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    loading,
    connectors,
    refetchConnectors,
  };
};
