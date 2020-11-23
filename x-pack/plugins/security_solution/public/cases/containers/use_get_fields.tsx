/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useCallback, useEffect, useState } from 'react';

import { errorToToaster, useStateToaster } from '../../common/components/toasters';
import { getFields } from './api';
import * as i18n from './translations';
import { ConnectorField } from '../../../../case/common/api';

interface FieldsState {
  fields: ConnectorField[];
  isLoading: boolean;
  isError: boolean;
}

const initialData: FieldsState = {
  fields: [],
  isLoading: false,
  isError: false,
};

export interface UseGetFields extends FieldsState {
  fetchFields: () => void;
}

export const useGetFields = (connectorId: string, connectorType: string): UseGetFields => {
  const [fieldsState, setFieldsState] = useState<FieldsState>(initialData);
  const [, dispatchToaster] = useStateToaster();

  const fetchFields = useCallback(() => {
    let didCancel = false;
    const abortCtrl = new AbortController();
    const fetchData = async () => {
      setFieldsState({
        ...fieldsState,
        isLoading: true,
      });
      try {
        const response = await getFields(connectorId, connectorType, abortCtrl.signal);
        if (!didCancel) {
          setFieldsState({
            fields: response,
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
          setFieldsState({
            fields: [],
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
  }, [fieldsState]);

  useEffect(() => {
    fetchFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...fieldsState,
    fetchFields,
  };
};
