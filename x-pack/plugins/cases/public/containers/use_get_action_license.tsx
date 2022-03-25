/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useRef } from 'react';

import { useToasts } from '../common/lib/kibana';
import { getActionLicense } from './api';
import * as i18n from './translations';
import { ActionLicense } from './types';
import { ConnectorTypes } from '../../common/api';

export interface ActionLicenseState {
  actionLicense: ActionLicense | null;
  isLoading: boolean;
  isError: boolean;
}

export const initialData: ActionLicenseState = {
  actionLicense: null,
  isLoading: true,
  isError: false,
};

const MINIMUM_LICENSE_REQUIRED_CONNECTOR = ConnectorTypes.jira;

export const useGetActionLicense = (): ActionLicenseState => {
  const [actionLicenseState, setActionLicensesState] = useState<ActionLicenseState>(initialData);
  const toasts = useToasts();
  const isCancelledRef = useRef(false);
  const abortCtrlRef = useRef(new AbortController());

  const fetchActionLicense = useCallback(async () => {
    try {
      isCancelledRef.current = false;
      abortCtrlRef.current.abort();
      abortCtrlRef.current = new AbortController();
      setActionLicensesState({
        ...initialData,
        isLoading: true,
      });

      const response = await getActionLicense(abortCtrlRef.current.signal);

      if (!isCancelledRef.current) {
        setActionLicensesState({
          actionLicense: response.find((l) => l.id === MINIMUM_LICENSE_REQUIRED_CONNECTOR) ?? null,
          isLoading: false,
          isError: false,
        });
      }
    } catch (error) {
      if (!isCancelledRef.current) {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            { title: i18n.ERROR_TITLE }
          );
        }

        setActionLicensesState({
          actionLicense: null,
          isLoading: false,
          isError: true,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionLicenseState]);

  useEffect(() => {
    fetchActionLicense();

    return () => {
      isCancelledRef.current = true;
      abortCtrlRef.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...actionLicenseState };
};
