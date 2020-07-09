/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, useCallback } from 'react';

import { useReadListIndex, useCreateListIndex, useIsMounted } from '../../../../lists_plugin_deps';
import { useHttp, useToasts } from '../../../../common/lib/kibana';
import { isApiError } from '../../../../common/utils/api';
import * as i18n from './translations';

export interface UseListsIndexState {
  indexExists: boolean | null;
}

export interface UseListsIndexReturn extends UseListsIndexState {
  loading: boolean;
  createIndex: () => void;
}

export const useListsIndex = (): UseListsIndexReturn => {
  const [state, setState] = useState<UseListsIndexState>({
    indexExists: null,
  });
  const isMounted = useIsMounted();
  const http = useHttp();
  const toasts = useToasts();
  const { loading: readLoading, start: readListIndex, ...readListIndexState } = useReadListIndex();
  const {
    loading: createLoading,
    start: createListIndex,
    ...createListIndexState
  } = useCreateListIndex();

  const createIndex = useCallback(() => {
    createListIndex({ http });
  }, [createListIndex, http]);

  // initial read list
  useEffect(() => {
    if (!readLoading && state.indexExists === null) {
      readListIndex({ http });
    }
  }, [http, readListIndex, readLoading, state.indexExists]);

  // handle read result
  useEffect(() => {
    if (isMounted() && readListIndexState.result != null) {
      setState({
        indexExists:
          readListIndexState.result.list_index && readListIndexState.result.list_item_index,
      });
    }
  }, [isMounted, readListIndexState.result]);

  // refetch index after creation
  useEffect(() => {
    if (isMounted() && createListIndexState.result != null) {
      readListIndex({ http });
    }
  }, [createListIndexState.result, http, isMounted, readListIndex]);

  // handle read error
  useEffect(() => {
    const error = readListIndexState.error;
    if (isMounted() && isApiError(error)) {
      setState({ indexExists: false });
      if (error.body.status_code !== 404) {
        toasts.addError(error, {
          title: i18n.LISTS_INDEX_FETCH_FAILURE,
          toastMessage: error.body.message,
        });
      }
    }
  }, [isMounted, readListIndexState.error, toasts]);

  // handle create error
  useEffect(() => {
    const error = createListIndexState.error;
    if (isMounted() && isApiError(error)) {
      toasts.addError(error, {
        title: i18n.LISTS_INDEX_CREATE_FAILURE,
        toastMessage: error.body.message,
      });
    }
  }, [createListIndexState.error, isMounted, toasts]);

  return { loading: readLoading || createLoading, createIndex, ...state };
};
