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
    const edge: HostRiskScoreEdges = {
      node: {
        ...get('latest_risk_hit.hits.hits[0]._source', bucket),
      },
      cursor: {
        value: bucket.key,
        tiebreaker: null,
      },
    };
    return edge;
  });
