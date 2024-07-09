/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import type { ALERT_RULE_NAME, ALERT_RULE_UUID } from '@kbn/rule-data-utils';

import type { RiskScoreInput } from '../../../common/api/entity_analytics/common';
import { useQueryAlerts } from '../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../detections/containers/detection_engine/alerts/constants';

import type {
  UserRiskScore,
  HostRiskScore,
} from '../../../common/search_strategy/security_solution/risk_score/all';
import { isUserRiskScore } from '../../../common/search_strategy/security_solution/risk_score/all';

interface UseRiskContributingAlerts {
  riskScore: UserRiskScore | HostRiskScore | undefined;
}

interface AlertData {
  [ALERT_RULE_UUID]: string;
  [ALERT_RULE_NAME]: string;
}

interface AlertHit {
  _id: string;
  _index: string;
  _source: AlertData;
}

export interface InputAlert {
  alert: AlertData;
  input: RiskScoreInput;
  _id: string;
}

export interface UseRiskContributingAlertsResult {
  loading: boolean;
  error: boolean;
  data?: InputAlert[];
}

/**
 * Fetches alerts related to the risk score
 */
export const useRiskContributingAlerts = ({
  riskScore,
}: UseRiskContributingAlerts): UseRiskContributingAlertsResult => {
  const { loading, data, setQuery } = useQueryAlerts<AlertHit, unknown>({
    query: {},
    queryName: ALERTS_QUERY_NAMES.BY_ID,
  });

  const inputs = getInputs(riskScore);

  useEffect(() => {
    if (!riskScore) return;
    setQuery({
      query: {
        ids: {
          values: inputs.map((input) => input.id),
        },
      },
    });
  }, [riskScore, inputs, setQuery]);

  const error = !loading && data === undefined;

  const alerts = inputs.map((input) => ({
    _id: input.id,
    input,
    alert: (data?.hits.hits.find((alert) => alert._id === input.id)?._source || {}) as AlertData,
  }));

  return {
    loading,
    error,
    data: alerts,
  };
};

const getInputs = (riskScore?: UserRiskScore | HostRiskScore) => {
  if (!riskScore) {
    return [];
  }

  if (isUserRiskScore(riskScore)) {
    return riskScore.user.risk.inputs;
  }

  return riskScore.host.risk.inputs;
};
