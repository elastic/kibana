/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { useSavedQueryServices } from '../../../../../common/utils/saved_query_services';
import { useAppToasts } from '../../../../../common/hooks/use_app_toasts';
import type { DefineStepRule } from '../types';

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
          addError(err, { title: 'Failed to fetch saved query' });
        })
        .finally(() => setIsSavedQueryLoading(false));
    }
  }, [savedQueryId, savedQueryServices, addError]);

  return {
    isSavedQueryLoading,
    savedQueryBar,
  };
};
