/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState, useRef } from 'react';

import { AbortError } from '../../../../../../src/plugins/kibana_utils/common';
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

const MINIMUM_LICENSE_REQUIRED_CONNECTOR = '.jira';

export const useGetActionLicense = (): ActionLicenseState => {
  const [actionLicenseState, setActionLicensesState] = useState<ActionLicenseState>(initialData);
  const [, dispatchToaster] = useStateToaster();
  const didCancel = useRef(false);
  const abortCtrl = useRef(new AbortController());

  const fetchActionLicense = useCallback(async () => {
    try {
      didCancel.current = false;
      abortCtrl.current.abort();
      abortCtrl.current = new AbortController();
      setActionLicensesState({
        ...initialData,
        isLoading: true,
      });

      const response = await getActionLicense(abortCtrl.current.signal);

      if (!didCancel.current) {
        setActionLicensesState({
          actionLicense: response.find((l) => l.id === MINIMUM_LICENSE_REQUIRED_CONNECTOR) ?? null,
          isLoading: false,
          isError: false,
        });
      }
    } catch (error) {
      if (!didCancel.current) {
        if (!(error instanceof AbortError)) {
          errorToToaster({
            title: i18n.ERROR_TITLE,
            error: error.body && error.body.message ? new Error(error.body.message) : error,
            dispatchToaster,
          });
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
      didCancel.current = true;
      abortCtrl.current.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ...actionLicenseState };
};
