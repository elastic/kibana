/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

interface BaseDataPoint {
  key: string;
  doc_count: number;
}

interface AggDataPoint extends estypes.AggregationsTermsAggregateBase {
  buckets: AggregationDataPoint[];
}

type AggregationDataPoint = BaseDataPoint & {
  [key: string]: AggDataPoint;
};

interface Aggs extends estypes.AggregationsTermsAggregateBase {
  buckets: AggregationDataPoint[];
}

interface Group {
  id: string;
  name: string;
  size: number;
}

interface Overlap {
  [platform: string]: { [policy: string]: number };
}

export const processAggregations = (
  aggs: Record<string, estypes.AggregationsAggregate> | undefined
) => {
  if (!aggs) {
    return {
      platforms: [],
      overlap: {},
      policies: [],
    };
  }

  const platforms: Group[] = [];
  const overlap: Overlap = {};
  const platformTerms = aggs.platforms as Aggs;
  const policyTerms = aggs.policies as Aggs;

  const policies =
    policyTerms?.buckets.map((o) => ({ name: o.key, id: o.key, size: o.doc_count })) ?? [];

  if (platformTerms?.buckets) {
    for (const { key, doc_count: size, policies: platformPolicies } of platformTerms.buckets) {
      platforms.push({ name: key, id: key, size });
      if (platformPolicies?.buckets && policies.length > 0) {
        overlap[key] = platformPolicies.buckets.reduce((acc: { [key: string]: number }, pol) => {
          acc[pol.key] = pol.doc_count;

          return acc;
        }, {} as { [key: string]: number });
      }
    }
  }

  return {
    platforms,
    overlap,
    policies,
  };
};
