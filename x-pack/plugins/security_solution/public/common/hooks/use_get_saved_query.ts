/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';

import { useSavedQueryServices } from '../utils/saved_query_services';
import type { DefineStepRule } from '../../detections/pages/detection_engine/rules/types';

import { useFetch, REQUEST_NAMES } from './use_fetch';
import { SAVED_QUERY_LOAD_ERROR_TOAST } from './translations';
import { useAppToasts } from './use_app_toasts';

export const useGetSavedQuery = (savedQueryId: string | undefined) => {
  const savedQueryServices = useSavedQueryServices();
  const { addError } = useAppToasts();
  const { fetch, data, isLoading, error } = useFetch(
    REQUEST_NAMES.GET_SAVED_QUERY,
    savedQueryServices.getSavedQuery
  );

  useEffect(() => {
    if (savedQueryId) {
      fetch(savedQueryId);
    }
  }, [savedQueryId, fetch]);

  useEffect(() => {
    if (error) {
      addError(error, { title: SAVED_QUERY_LOAD_ERROR_TOAST });
    }
  }, [error, addError]);

  const savedQueryBar = useMemo<DefineStepRule['queryBar'] | null>(
    () =>
      data
        ? {
            saved_id: data.id,
            filters: data.attributes.filters ?? [],
            query: data.attributes.query,
            title: data.attributes.title,
          }
        : null,
    [data]
  );

  return {
    isSavedQueryLoading: isLoading,
    savedQueryBar,
  };
};
