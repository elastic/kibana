/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOr } from 'lodash/fp';
import { RiskScoreHit, RiskScoreEdges } from '../../../../../../common';

export const formatRiskScoreData = (buckets: RiskScoreHit[]): RiskScoreEdges[] =>
  buckets.map((bucket) => ({
    node: {
      _id: bucket.key,
      host_name: bucket.key,
      risk_score: getOr(0, 'risk_score.value', bucket),
      risk_keyword: getOr(0, 'risk_keyword.buckets[0].key', bucket),
    },
    cursor: {
      value: bucket.key,
      tiebreaker: null,
    },
  }));
