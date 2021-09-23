/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostRiskScoreRequestOptions } from '../../../../../../common/search_strategy/security_solution/hosts/risk_score';

export const buildRiskScoreQuery = ({ hostName, defaultIndex }: HostRiskScoreRequestOptions) => {
  const dslQuery = {
    index: defaultIndex,
    allowNoIndices: false,
    ignoreUnavailable: true,
    track_total_hits: false,
    body: {
      query: {
        bool: {
          filter: [{ term: { 'host.name': hostName } }],
        },
      },
    },
  };

  return dslQuery;
};
