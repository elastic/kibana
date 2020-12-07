/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { orderBy } from 'lodash';
import {
  AggregationOptionsByType,
  AggregationResultOf,
} from '../../../../../../typings/elasticsearch/aggregations';

export interface TopSigTerm {
  bgCount: number;
  fgCount: number;
  fieldName: string;
  fieldValue: string | number;
  score: number;
}

type SigTermAggs = AggregationResultOf<
  { significant_terms: AggregationOptionsByType['significant_terms'] },
  {}
>;

export function formatTopSignificantTerms(
  aggregations?: Record<string, SigTermAggs>
) {
  const significantTerms = Object.entries(aggregations ?? []).flatMap(
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
  const topSigTerms = orderBy(significantTerms, 'score', 'desc').slice(0, 10);
  return topSigTerms;
}
