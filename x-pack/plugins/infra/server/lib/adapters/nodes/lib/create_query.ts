/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  InfraFilter,
  InfraFilterType,
  InfraGroupBy,
  InfraGroupByFilter,
} from '../../../../../common/types';

import {
  InfraESBoolQuery,
  InfraESQuery,
  InfraESRangeQuery,
  InfraNodeRequestOptions,
} from '../../../infra_types';

import {
  isGroupByFilters,
  isGroupByTerms,
} from '../../../../../common/type_guards';
import { convertInputFilterToESQuery } from '../lib/convert_input_filter_to_es_query';

export function createQuery(options: InfraNodeRequestOptions): InfraESQuery {
  const {
    timerange,
    indexPattern,
    groupBy,
    filters,
  }: InfraNodeRequestOptions = options;
  const mustClause: InfraESQuery[] = [];
  const shouldClause: InfraESQuery[] = [];
  const filterClause: InfraESQuery[] = [];

  const rangeFilter: InfraESRangeQuery = {
    range: {
      [indexPattern.timeFieldName]: {
        format: 'epoch_millis',
        gte: timerange.from,
        lte: timerange.to,
      },
    },
  };
  filterClause.push(rangeFilter);

  if (groupBy) {
    groupBy.forEach((group: InfraGroupBy): void => {
      if (isGroupByTerms(group) && group.field) {
        const inputFilter: InfraFilter = {
          type: InfraFilterType.exists,
          value: group.field,
        };
        mustClause.push(convertInputFilterToESQuery(inputFilter));
      }
      if (isGroupByFilters(group) && group.filters) {
        group.filters!.forEach(
          (groupFilter: InfraGroupByFilter | null): void => {
            if (groupFilter != null && groupFilter.query) {
              const inputFilter: InfraFilter = {
                type: InfraFilterType.query_string,
                value: groupFilter.query,
              };
              shouldClause.push(convertInputFilterToESQuery(inputFilter));
            }
          }
        );
      }
    });
  }

  if (filters) {
    filters.forEach((filter: InfraFilter): void => {
      mustClause.push(convertInputFilterToESQuery(filter));
    });
  }

  const query: InfraESBoolQuery = {
    bool: {
      filter: filterClause,
      must: mustClause,
      should: shouldClause,
    },
  };

  return query;
}
