/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type {
  AlertInstanceContext,
  AlertInstanceState,
  RuleExecutorServices,
} from '@kbn/alerting-plugin/server';
import { buildGroupByFieldAggregation } from './build_group_by_field_aggregation';

interface GetEventsByGroupArgs {
  baseQuery: estypes.SearchRequest;
  groupByFields: string[];
  maxSignals: number;
  sort: estypes.Sort;
  services: RuleExecutorServices<AlertInstanceState, AlertInstanceContext, 'default'>;
}

export const getEventsByGroup = async ({
  baseQuery,
  groupByFields,
  services,
  maxSignals,
  sort,
}: GetEventsByGroupArgs) => {
  return services.scopedClusterClient.asCurrentUser.search({
    ...baseQuery,
    body: {
      ...baseQuery.body,
      track_total_hits: true,
      aggs: buildGroupByFieldAggregation({ groupByFields, maxSignals, sort }),
    },
  });
};
