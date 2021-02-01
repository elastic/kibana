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
} from '../../../../../typings/elasticsearch';

export interface TopSigTerm {
  bgCount: number;
  fgCount: number;
  fieldName: string;
  fieldValue: string | number;
  score: number;
}

type SigTermAgg = AggregationResultOf<
  { significant_terms: AggregationOptionsByType['significant_terms'] },
  {}
>;

export function processSignificantTermAggs({
  sigTermAggs,
  thresholdPercentage,
}: {
  sigTermAggs: Record<string, SigTermAgg>;
  thresholdPercentage: number;
}) {
  const significantTerms = Object.entries(sigTermAggs).flatMap(
    ([fieldName, agg]) => {
      return agg.buckets.map((bucket) => ({
        fieldName,
        fieldValue: bucket.key,
        bgCount: bucket.bg_count,
        fgCount: bucket.doc_count,
        score: bucket.score,
      }));
    }
  );

  // get top 10 terms ordered by score
  const topSigTerms = orderBy(significantTerms, 'score', 'desc')
    .filter(({ bgCount, fgCount }) => {
      // only include results that are above the threshold
      return Math.floor((fgCount / bgCount) * 100) > thresholdPercentage;
    })
    .slice(0, 10);
  return topSigTerms;
}
