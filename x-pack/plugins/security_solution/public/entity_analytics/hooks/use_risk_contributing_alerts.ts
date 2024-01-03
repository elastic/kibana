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
import {
  isUserRiskScore,
  RiskScoreFields,
} from '../../../common/search_strategy/security_solution/risk_score/all';
import { getStartDateFromRiskScore } from '../common/get_start_date_from_risk_score';
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

const ALERTS_SIZE = 100;

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

    let entityField: string;
    let entityValue: string;

    if (isUserRiskScore(riskScore)) {
      entityField = RiskScoreFields.userName;
      entityValue = riskScore.user.name;
    } else {
      entityField = RiskScoreFields.hostName;
      entityValue = riskScore.host.name;
    }
    const riskScoreTimestamp = riskScore['@timestamp'];
    const startRiskScoringDate = getStartDateFromRiskScore({
      riskScoreTimestamp,
      riskRangeStart: riskEngineSettings.range.start,
    });

    setQuery(
      getQuery({
        from: startRiskScoringDate,
        to: riskScoreTimestamp,
        entityField,
        entityValue,
        fields,
      })
    );
  }, [setQuery, riskScore, riskEngineSettings?.range?.start]);

  const error = !loading && data === undefined;

  return {
    loading,
    error,
    data: data?.hits.hits,
  };
};

const getQuery = ({
  from,
  to,
  entityField,
  entityValue,
  fields,
}: {
  from: string;
  to: string;
  entityField: string;
  entityValue: string;
  fields?: string[];
}) => {
  return {
    fields: fields || ['*'],
    size: ALERTS_SIZE,
    _source: false,
    query: {
      bool: {
        filter: [
          { term: { [entityField]: entityValue } },
          {
            range: {
              '@timestamp': {
                gte: from,
                lte: to,
              },
            },
          },
        ],
      },
    },
  };
};
