/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash';
import { useEffect, useState } from 'react';
import { APP_ID } from '../../../../../common/constants';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { getCaseIdsFromAlertId } from './api';
import { CASES_FROM_ALERTS_FAILURE } from './translations';
import type { CasesFromAlertsResponse } from './types';

interface CasesFromAlertsStatus {
  loading: boolean;
  casesInfo: CasesFromAlertsResponse;
}

export const useCasesFromAlerts = ({ alertId }: { alertId: string }): CasesFromAlertsStatus => {
  const [loading, setLoading] = useState(false);
  const [cases, setCases] = useState<CasesFromAlertsResponse>([]);
  const { addError } = useAppToasts();

  useEffect(() => {
    // isMounted tracks if a component is mounted before changing state
    let isMounted = true;
    setLoading(true);
    const fetchData = async () => {
      try {
        const casesResponse = await getCaseIdsFromAlertId({ alertId, owner: [APP_ID] });
        if (isMounted) {
          setCases(casesResponse);
        }
      } catch (error) {
        addError(error.message, { title: CASES_FROM_ALERTS_FAILURE });
      }
      if (isMounted) {
        setLoading(false);
      }
    };
    if (!isEmpty(alertId)) {
      fetchData();
    }
    return () => {
      // updates to show component is unmounted
      isMounted = false;
    };
  }, [alertId, addError]);
  return { loading, casesInfo: cases };
};
