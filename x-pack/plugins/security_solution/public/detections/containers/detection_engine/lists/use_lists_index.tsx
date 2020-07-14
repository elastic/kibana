/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, useCallback } from 'react';

import { useReadListIndex, useCreateListIndex } from '../../../../shared_imports';
import { useHttp, useToasts, useKibana } from '../../../../common/lib/kibana';
import { isApiError } from '../../../../common/utils/api';
import * as i18n from './translations';

export interface UseListsIndexState {
  indexExists: boolean | null;
}

export interface UseListsIndexReturn extends UseListsIndexState {
  loading: boolean;
  createIndex: () => void;
  createIndexError: unknown;
  createIndexResult: { acknowledged: boolean } | undefined;
}

export const useListsIndex = (): UseListsIndexReturn => {
  const [state, setState] = useState<UseListsIndexState>({
    indexExists: null,
  });
  const { lists } = useKibana().services;
  const http = useHttp();
  const toasts = useToasts();
  const { loading: readLoading, start: readListIndex, ...readListIndexState } = useReadListIndex();
  const {
    loading: createLoading,
    start: createListIndex,
    ...createListIndexState
  } = useCreateListIndex();
  const loading = readLoading || createLoading;

  const readIndex = useCallback(() => {
    if (lists) {
      readListIndex({ http });
    }
  }, [http, lists, readListIndex]);

  const createIndex = useCallback(() => {
    if (lists) {
      createListIndex({ http });
    }
  }, [createListIndex, http, lists]);

  // initial read list
  useEffect(() => {
    if (!readLoading && state.indexExists === null) {
      readIndex();
    }
  }, [readIndex, readLoading, state.indexExists]);

  // handle read result
  useEffect(() => {
    if (readListIndexState.result != null) {
      setState({
        indexExists:
          readListIndexState.result.list_index && readListIndexState.result.list_item_index,
      });
    }
  }, [readListIndexState.result]);

  // refetch index after creation
  useEffect(() => {
    if (createListIndexState.result != null) {
      readIndex();
    }
  }, [createListIndexState.result, readIndex]);

  // handle read error
  useEffect(() => {
    const error = readListIndexState.error;
    if (isApiError(error)) {
      setState({ indexExists: false });
      if (error.body.status_code !== 404) {
        toasts.addError(error, {
          title: i18n.LISTS_INDEX_FETCH_FAILURE,
          toastMessage: error.body.message,
        });
      }
    }
  }, [readListIndexState.error, toasts]);

  // handle create error
  useEffect(() => {
    const error = createListIndexState.error;
    if (isApiError(error)) {
      toasts.addError(error, {
        title: i18n.LISTS_INDEX_CREATE_FAILURE,
        toastMessage: error.body.message,
      });
    }
  }, [createListIndexState.error, toasts]);

  return {
    loading,
    createIndex,
    createIndexError: createListIndexState.error,
    createIndexResult: createListIndexState.result,
    ...state,
  };
};
