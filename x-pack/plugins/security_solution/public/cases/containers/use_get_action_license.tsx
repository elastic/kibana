/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useState } from 'react';

import { errorToToaster, useStateToaster } from '../../common/components/toasters';
import { getActionLicense } from './api';
import * as i18n from './translations';
import { ActionLicense } from './types';

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

export const useGetActionLicense = (): ActionLicenseState => {
  const [actionLicenseState, setActionLicensesState] = useState<ActionLicenseState>(initialData);

  const [, dispatchToaster] = useStateToaster();

  const fetchActionLicense = useCallback(() => {
    let didCancel = false;
    const abortCtrl = new AbortController();
    const fetchData = async () => {
      setActionLicensesState({
        ...actionLicenseState,
        isLoading: true,
      });
      try {
        const response = await getActionLicense(abortCtrl.signal);
        if (!didCancel) {
          setActionLicensesState({
            actionLicense: response.find((l) => l.id === '.servicenow') ?? null,
            isLoading: false,
            isError: false,
          });
        }
      } catch (error) {
        if (!didCancel) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
          setActionLicensesState({
            actionLicense: null,
            isLoading: false,
            isError: true,
          });
        }
      }
    };
    fetchData();
    return () => {
      didCancel = true;
      abortCtrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionLicenseState]);

  useEffect(() => {
    fetchActionLicense();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { ...actionLicenseState };
};
