/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';

import { useSavedQueryServices } from '../../../../common/utils/saved_query_services';
import type { DefineStepRule } from './types';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

import { SAVED_QUERY_LOAD_ERROR_TOAST } from './translations';

interface UseGetSavedQuerySettings {
  savedQueryId: string | undefined;
  onError?: (e: unknown) => void;
  ruleType: Type | undefined;
}

export const useGetSavedQuery = ({ savedQueryId, ruleType, onError }: UseGetSavedQuerySettings) => {
  const savedQueryServices = useSavedQueryServices();
  const { addError } = useAppToasts();

  const defaultErrorHandler = (e: unknown) => {
    addError(e, { title: SAVED_QUERY_LOAD_ERROR_TOAST });
  };

  const query = useQuery(
    ['detectionEngine', 'rule', 'savedQuery', savedQueryId],
    async () => {
      // load saved query only if rule type === 'saved_query', as other rule types still can have saved_id property that is not used
      // Rule schema allows to save any rule with saved_id property, but it only used for saved_query rule type
      // In future we might look in possibility to restrict rule schema (breaking change!) and remove saved_id from the rest of rules through migration
      if (!savedQueryId || ruleType !== 'saved_query') {
        return null;
      }

      return savedQueryServices.getSavedQuery(savedQueryId);
    },
    {
      onError: onError ?? defaultErrorHandler,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const savedQueryBar = useMemo<DefineStepRule['queryBar'] | null>(
    () =>
      query.data
        ? {
            saved_id: query.data.id,
            filters: query.data.attributes.filters ?? [],
            query: query.data.attributes.query,
            title: query.data.attributes.title,
          }
        : null,
    [query.data]
  );

  return {
    isSavedQueryLoading: savedQueryId ? query.isLoading : false,
    savedQueryBar,
    savedQuery: query.data ?? undefined,
  };
};
