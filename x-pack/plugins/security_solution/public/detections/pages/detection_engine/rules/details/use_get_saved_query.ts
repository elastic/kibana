/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { useSavedQueryServices } from '../../../../../common/utils/saved_query_services';

import type { DefineStepRule } from '../types';

export const useGetSavedQuery = (savedQueryId: string | undefined) => {
  const savedQueryServices = useSavedQueryServices();
  const [isSavedQueryLoading, setIsSavedQueryLoading] = useState(false);
  const [savedQueryBar, setSavedQueryBar] = useState<DefineStepRule['queryBar'] | null>(null);

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
        .finally(() => setIsSavedQueryLoading(false));
    }
  }, [savedQueryId, savedQueryServices]);

  return {
    isSavedQueryLoading,
    savedQueryBar,
  };
};
