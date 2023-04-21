/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import type { CasesByAlertId } from '@kbn/cases-plugin/common/api';
import { useKibana, useToasts } from '../../../common/lib/kibana';
import { APP_ID } from '../../../../common/constants';
import { CASES_ERROR_TOAST } from '../../../common/components/event_details/insights/translations';

export interface UseFetchRelatedCasesParams {
  /**
   * Id of the document
   */
  eventId: string;
}
export interface UseFetchRelatedCasesValue {
  /**
   * Returns true while data is loading
   */
  loading: boolean;
  /**
   * Returns true if there is an error while retrieving data
   */
  error: boolean;
  /**
   * Cases data retrieved
   */
  data: CasesByAlertId | undefined;
  /**
   * Number of data entries received
   */
  dataCount: number;
}

/**
 * Returns the number of cases related to a document id (and the loading, error statuses as well as the cases count)
 */
export const useFetchRelatedCases = ({
  eventId,
}: UseFetchRelatedCasesParams): UseFetchRelatedCasesValue => {
  const {
    services: { cases },
  } = useKibana();
  const toasts = useToasts();

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<boolean>(false);
  const [relatedCases, setRelatedCases] = useState<CasesByAlertId | undefined>(undefined);

  // fetch related cases
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);

      let relatedCaseList: CasesByAlertId = [];
      try {
        if (eventId) {
          relatedCaseList =
            (await cases.api.getRelatedCases(eventId, {
              owner: APP_ID,
            })) ?? [];
        }
      } catch (err) {
        setError(true);
        setLoading(false);

        toasts.addWarning(CASES_ERROR_TOAST(err));
      }

      setLoading(false);
      setRelatedCases(relatedCaseList);
    };

    fetch();
  }, [cases.api, eventId, toasts]);

  return {
    loading,
    error,
    data: relatedCases,
    dataCount: (relatedCases || []).length,
  };
};
