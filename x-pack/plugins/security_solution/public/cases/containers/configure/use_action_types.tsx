/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect, useCallback } from 'react';

import { useStateToaster, errorToToaster } from '../../../common/components/toasters';
import * as i18n from '../translations';
import { fetchActionTypes } from './api';
import { ActionTypeConnector } from './types';

export interface UseActionTypesResponse {
  loading: boolean;
  actionTypes: ActionTypeConnector[];
  refetchActionTypes: () => void;
}

export const useActionTypes = (): UseActionTypesResponse => {
  const [, dispatchToaster] = useStateToaster();
  const [loading, setLoading] = useState(true);
  const [actionTypes, setActionTypes] = useState<ActionTypeConnector[]>([]);

  const refetchActionTypes = useCallback(() => {
    let didCancel = false;
    const abortCtrl = new AbortController();
    const getActionTypes = async () => {
      try {
        setLoading(true);
        const res = await fetchActionTypes({ signal: abortCtrl.signal });
        if (!didCancel) {
          setLoading(false);
          setActionTypes(res);
        }
      } catch (error) {
        if (!didCancel) {
          setLoading(false);
          setActionTypes([]);
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
        }
      }
    };
    getActionTypes();
    return () => {
      didCancel = true;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refetchActionTypes();
  }, [refetchActionTypes]);

  return {
    loading,
    actionTypes,
    refetchActionTypes,
  };
};
