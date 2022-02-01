/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash/fp';
import { HostRiskScoreBuckets, HostRiskScoreEdges } from '../../../../../../common/search_strategy';

export const formatHostRisksEdges = (buckets: HostRiskScoreBuckets[]): HostRiskScoreEdges[] =>
  buckets.map((bucket: HostRiskScoreBuckets) => {
    const metrics = get('latest_risk_hit.top[0].metrics', bucket);
    const edge: HostRiskScoreEdges = {
      node: {
        '@timestamp': get('@timestamp', metrics),
        host: {
          name: get('host.name', metrics),
        },
        risk_stats: {
          risk_score: get('risk_stats.risk_score', metrics),
          rule_risks: [],
        },
        risk: get('risk.keyword', metrics),
      },
      cursor: {
        value: bucket.key,
        tiebreaker: null,
      },
    };
    return edge;
  });
