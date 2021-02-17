/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { orderBy } from 'lodash';
import {
  AggregationOptionsByType,
  AggregationResultOf,
} from '../../../../../typings/elasticsearch/aggregations';

export interface TopSigTerm {
  fieldName: string;
  fieldValue: string | number;
  score: number;
  impact: number;
  fieldCount: number;
  valueCount: number;
}

type SigTermAgg = AggregationResultOf<
  { significant_terms: AggregationOptionsByType['significant_terms'] },
  {}
>;

function getMaxImpactScore(scores: number[]) {
  if (scores.length === 0) {
    return 0;
  }

  const sortedScores = scores.sort((a, b) => b - a);
  const maxScore = sortedScores[0];

  // calculate median
  const halfSize = scores.length / 2;
  const medianIndex = Math.floor(halfSize);
  const medianScore =
    medianIndex < halfSize
      ? sortedScores[medianIndex]
      : (sortedScores[medianIndex - 1] + sortedScores[medianIndex]) / 2;

  return Math.max(maxScore, medianScore * 2);
}

export function processSignificantTermAggs({
  sigTermAggs,
}: {
  sigTermAggs: Record<string, SigTermAgg>;
}) {
  const significantTerms = Object.entries(sigTermAggs).flatMap(
    ([fieldName, agg]) => {
      return agg.buckets.map((bucket) => ({
        fieldName,
        fieldValue: bucket.key,
        fieldCount: agg.doc_count,
        valueCount: bucket.doc_count,
        score: bucket.score,
      }));
    }
  );

  const maxImpactScore = getMaxImpactScore(
    significantTerms.map(({ score }) => score)
  );

  // get top 10 terms ordered by score
  const topSigTerms = orderBy(significantTerms, 'score', 'desc')
    .map((significantTerm) => ({
      ...significantTerm,
      impact: significantTerm.score / maxImpactScore,
    }))
    .slice(0, 10);
  return topSigTerms;
}
