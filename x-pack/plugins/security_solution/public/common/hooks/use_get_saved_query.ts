/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { useSavedQueryServices } from '../utils/saved_query_services';
import type { DefineStepRule } from '../../detections/pages/detection_engine/rules/types';

import { SAVED_QUERY_LOAD_ERROR_TOAST } from './translations';
import { useAppToasts } from './use_app_toasts';

export const useGetSavedQuery = (savedQueryId: string | undefined) => {
  const savedQueryServices = useSavedQueryServices();
  const [isSavedQueryLoading, setIsSavedQueryLoading] = useState(false);
  const [savedQueryBar, setSavedQueryBar] = useState<DefineStepRule['queryBar'] | null>(null);
  const { addError } = useAppToasts();

  useEffect(() => {
    if (savedQueryId) {
      setIsSavedQueryLoading(true);
      savedQueryServices
        .getSavedQuery(savedQueryId)
        .then((newSavedQuery) => {
          setIsSavedQueryLoading(false);
          setSavedQueryBar({
            saved_id: newSavedQuery.id,
            filters: newSavedQuery.attributes.filters ?? [],
            query: newSavedQuery.attributes.query,
            title: newSavedQuery.attributes.title,
          });
        })
        .catch((err) => {
          addError(err, { title: SAVED_QUERY_LOAD_ERROR_TOAST });
        })
        .finally(() => setIsSavedQueryLoading(false));
    }
  }, [savedQueryId, savedQueryServices, addError]);

  return {
    isSavedQueryLoading,
    savedQueryBar,
  };
};
