/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { getCaseIdsFromAlertId } from './api';
import { CASES_FROM_ALERTS_FAILURE } from './translations';
import { CasesFromAlertsResponse } from './types';

interface CasesFromAlertsStatus {
  loading: boolean;
  caseIds: CasesFromAlertsResponse;
}

export const useCasesFromAlerts = ({ alertId }: { alertId: string }): CasesFromAlertsStatus => {
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState<CasesFromAlertsResponse>([]);
  const { addError } = useAppToasts();

  useEffect(() => {
    setLoading(true);
    const fetchData = async () => {
      try {
        const casesResponse = await getCaseIdsFromAlertId({ alertId });
        setCases(casesResponse);
        setLoading(false);
      } catch (error) {
        addError(error.message, { title: CASES_FROM_ALERTS_FAILURE });
        setLoading(false);
      }
    };
    fetchData();
  }, [alertId, addError]);
  return { loading, caseIds: cases };
};
