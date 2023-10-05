/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { RawData } from '../../../utils/normalization';

// The number of Kibana spaces is limited by the `maxSpaces` config setting of the spaces plugin.
// At the time of writing this comment, `maxSpaces` defaults to 1000.
// So in normal conditions there can't exist more than 1000 Kibana spaces.
//
// However, we set `MAX_KIBANA_SPACES` to a higher value to handle rare cases when there are more
// than 1000 spaces in a cluster. Hopefully it will cover 99.(9)% of use cases.
//
// In the rest of the edge cases, we will be missing some spaces, but the effect of this will be
// limited by the fact that the aggregation below will sort spaces desc by rules count in them.
// It will return spaces with most of the existing rules, and will not return spaces with fewer
// number of rules. Hopefully, we will miss only spaces with very few rules. This should be
// acceptable because the goal of getting all space ids in the rule monitoring subdomain is to be
// able to aggregate health metrics for those spaces. It's unlikely that spaces with very few rules
// will have a major impact on health and performance metrics of the whole cluster.
const MAX_KIBANA_SPACES = 10_000;

export const getSpacesAggregation = (): Record<
  string,
  estypes.AggregationsAggregationContainer
> => {
  return {
    rulesBySpace: {
      terms: {
        field: 'alert.namespaces',
        size: MAX_KIBANA_SPACES,
      },
    },
  };
};

export const normalizeSpacesAggregation = (
  aggregations: Record<string, RawData> | undefined
): string[] => {
  const rulesBySpace: RawData = aggregations?.rulesBySpace || {};
  const buckets: RawData[] = rulesBySpace.buckets || [];
  const spaceIds = buckets.map<string>((b: RawData) => String(b.key));
  return spaceIds;
};
