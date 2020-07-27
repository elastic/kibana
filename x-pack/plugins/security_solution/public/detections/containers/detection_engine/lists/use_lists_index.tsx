/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useEffect, useState, useCallback } from 'react';

import { useReadListIndex, useCreateListIndex } from '../../../../shared_imports';
import { useHttp, useKibana } from '../../../../common/lib/kibana';
import { isSecurityAppError } from '../../../../common/utils/api';
import * as i18n from './translations';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

export interface UseListsIndexReturn {
  createIndex: () => void;
  indexExists: boolean | null;
  error: unknown;
  loading: boolean;
}

export const useListsIndex = (): UseListsIndexReturn => {
  const [indexExists, setIndexExists] = useState<boolean | null>(null);
  const [error, setError] = useState<unknown>(null);
  const { lists } = useKibana().services;
  const http = useHttp();
  const { addError } = useAppToasts();
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
    if (!readLoading && !error && indexExists === null) {
      readIndex();
    }
  }, [error, indexExists, readIndex, readLoading]);

  // handle read result
  useEffect(() => {
    if (readListIndexState.result != null) {
      setIndexExists(
        readListIndexState.result.list_index && readListIndexState.result.list_item_index
      );
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
    const err = readListIndexState.error;
    if (err != null) {
      if (isSecurityAppError(err) && err.body.status_code === 404) {
        setIndexExists(false);
      } else {
        setError(err);
        addError(err, { title: i18n.LISTS_INDEX_FETCH_FAILURE });
      }
    }
  }, [addError, readListIndexState.error]);

  // handle create error
  useEffect(() => {
    const err = createListIndexState.error;
    if (err != null) {
      setError(err);
      addError(err, { title: i18n.LISTS_INDEX_CREATE_FAILURE });
    }
  }, [addError, createListIndexState.error]);

  return {
    createIndex,
    error,
    indexExists,
    loading,
  };
};
