/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useQueryAlerts } from '../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../detections/containers/detection_engine/alerts/constants';

import type {
  UserRiskScore,
  HostRiskScore,
} from '../../../common/search_strategy/security_solution/risk_score/all';
import { getAlertsQueryForRiskScore } from '../common/get_alerts_query_for_risk_score';

import { useRiskEngineSettings } from '../api/hooks/use_risk_engine_settings';

interface UseRiskContributingAlerts {
  riskScore: UserRiskScore | HostRiskScore | undefined;
  fields?: string[];
}

interface Hit {
  fields: Record<string, string[]>;
  _index: string;
  _id: string;
}

interface UseRiskContributingAlertsResult {
  loading: boolean;
  error: boolean;
  data?: Hit[];
}

/**
 * Fetches alerts related to the risk score
 */
export const useRiskContributingAlerts = ({
  riskScore,
  fields,
}: UseRiskContributingAlerts): UseRiskContributingAlertsResult => {
  const { data: riskEngineSettings } = useRiskEngineSettings();

  const { loading, data, setQuery } = useQueryAlerts<Hit, unknown>({
    // is empty query, to skip fetching alert, until we have risk engine settings
    query: {},
    queryName: ALERTS_QUERY_NAMES.BY_ID,
  });

  useEffect(() => {
    if (!riskEngineSettings?.range?.start || !riskScore) return;

    setQuery(
      getAlertsQueryForRiskScore({
        riskRangeStart: riskEngineSettings.range.start,
        riskScore,
        fields,
      })
    );
  }, [setQuery, riskScore, riskEngineSettings?.range?.start, fields]);

  const error = !loading && data === undefined;

  return {
    loading,
    error,
    data: data?.hits.hits,
  };
};
