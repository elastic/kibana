/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TableId } from '@kbn/securitysolution-data-table';
import { useCallback, useMemo } from 'react';
import { useDeepEqualSelector } from '../../common/hooks/use_selector';
import { inputsSelectors } from '../../common/store';
import type { Refetch } from '../../common/types';

const useRefetchByQueryId = (QueryId: string) => {
  const getGlobalQuery = useMemo(() => inputsSelectors.globalQueryByIdSelector(), []);
  const { refetch } = useDeepEqualSelector((state) => getGlobalQuery(state, QueryId));
  return refetch;
};

export const useRefetchOverviewPageRiskScore = (overviewRiskScoreQueryId: string) => {
  const refetchOverviewRiskScore = useRefetchByQueryId(overviewRiskScoreQueryId);
  const refetchAlertsRiskInputs = useRefetchByQueryId(TableId.alertsRiskInputs);

  const refetchRiskScore = useCallback(() => {
    if (refetchOverviewRiskScore) {
      (refetchOverviewRiskScore as Refetch)();
    }

    if (refetchAlertsRiskInputs) {
      (refetchAlertsRiskInputs as Refetch)();
    }
  }, [refetchAlertsRiskInputs, refetchOverviewRiskScore]);
  return refetchRiskScore;
};
