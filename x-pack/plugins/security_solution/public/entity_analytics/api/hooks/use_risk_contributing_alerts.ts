/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../detections/containers/detection_engine/alerts/constants';

import type {
  UserRiskScore,
  HostRiskScore,
} from '../../../../common/search_strategy/security_solution/risk_score/all';
import {
  isUserRiskScore,
  RiskScoreFields,
} from '../../../../common/search_strategy/security_solution/risk_score/all';
import { getStartDateFromRiskScore } from '../../common/get_start_date_from_risk_score';

interface UseRiskContributingAlerts {
  riskScore: UserRiskScore | HostRiskScore;
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
}: UseRiskContributingAlerts): UseRiskContributingAlertsResult => {
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
    riskRangeStart: 'now-30d',
  });

  const [initialQuery] = useState(() =>
    getQuery({
      from: startRiskScoringDate,
      to: riskScoreTimestamp,
      entityField,
      entityValue,
    })
  );

  const { loading, data, setQuery } = useQueryAlerts<Hit, unknown>({
    query: initialQuery,
    queryName: ALERTS_QUERY_NAMES.BY_ID,
  });

  useEffect(() => {
    setQuery(
      getQuery({
        from: startRiskScoringDate,
        to: riskScoreTimestamp,
        entityField,
        entityValue,
      })
    );
  }, [setQuery, riskScoreTimestamp, startRiskScoringDate, entityField, entityValue]);

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
}: {
  from: string;
  to: string;
  entityField: string;
  entityValue: string;
}) => {
  return {
    fields: ['*'],
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
