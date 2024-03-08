/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  isUserRiskScore,
  RiskScoreFields,
} from '../../../common/search_strategy/security_solution/risk_score/all';
import type {
  UserRiskScore,
  HostRiskScore,
} from '../../../common/search_strategy/security_solution/risk_score/all';
import { getStartDateFromRiskScore } from './get_start_date_from_risk_score';

const ALERTS_SIZE = 1000;

/**
 * return query to fetch alerts related to the risk score
 */
export const getAlertsQueryForRiskScore = ({
  riskRangeStart,
  riskScore,
  fields,
}: {
  riskRangeStart: string;
  riskScore: UserRiskScore | HostRiskScore;
  fields?: string[];
}) => {
  let entityField: string;
  let entityValue: string;

  if (isUserRiskScore(riskScore)) {
    entityField = RiskScoreFields.userName;
    entityValue = riskScore.user.name;
  } else {
    entityField = RiskScoreFields.hostName;
    entityValue = riskScore.host.name;
  }

  const from = getStartDateFromRiskScore({
    riskScoreTimestamp: riskScore['@timestamp'],
    riskRangeStart,
  });

  const riskScoreTimestamp = riskScore['@timestamp'];

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
                lte: riskScoreTimestamp,
              },
            },
          },
        ],
      },
    },
  };
};
