/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState, useEffect } from 'react';
import type { RelatedCaseInfo } from '@kbn/cases-plugin/common/api';
import { useKibana, useToasts } from '../../lib/kibana';
import { CASES_ERROR_TOAST } from '../../components/event_details/insights/translations';
import { APP_ID } from '../../../../common/constants';

export const useGetRelatedCasesByEvent = (eventId: string) => {
  const {
    services: { cases },
  } = useKibana();
  const toasts = useToasts();

  const [relatedCases, setRelatedCases] = useState<RelatedCaseInfo[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<null | unknown>(null);

  const getRelatedCases = useCallback(async () => {
    setLoading(true);
    let relatedCasesResponse: RelatedCaseInfo[] = [];
    try {
      if (eventId) {
        relatedCasesResponse =
          (await cases.api.getRelatedCases(eventId, {
            owner: APP_ID,
          })) ?? [];
      }
    } catch (err) {
      setError(err);
      toasts.addWarning(CASES_ERROR_TOAST(err));
    } finally {
      setRelatedCases(relatedCasesResponse);
      setLoading(false);
    }
  }, [eventId, cases.api, toasts]);

  useEffect(() => {
    getRelatedCases();
  }, [eventId, getRelatedCases]);

  return {
    loading,
    error,
    relatedCases,
    refetchRelatedCases: getRelatedCases,
  };
};
