/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraPathFilterInput, InfraPathInput } from '../../../../../common/graphql/types';

import {
  InfraESBoolQuery,
  InfraESQuery,
  InfraESRangeQuery,
  InfraNodeRequestOptions,
} from '../adapter_types';

import { isGroupByFilters, isGroupByTerms } from './type_guards';

export function createQuery(options: InfraNodeRequestOptions): InfraESQuery {
  const { timerange, sourceConfiguration, groupBy, filterQuery }: InfraNodeRequestOptions = options;
  const mustClause: InfraESQuery[] = [];
  const shouldClause: InfraESQuery[] = [];
  const filterClause: InfraESQuery[] = [];

  const rangeFilter: InfraESRangeQuery = {
    range: {
      [sourceConfiguration.fields.timestamp]: {
        format: 'epoch_millis',
        gte: timerange.from,
        lte: timerange.to,
      },
    },
  };

  filterClause.push(rangeFilter);

  if (groupBy) {
    groupBy.forEach(
      (group: InfraPathInput): void => {
        if (isGroupByTerms(group) && group.field) {
          mustClause.push({
            exists: {
              field: group.field,
            },
          });
        }
        if (isGroupByFilters(group) && group.filters) {
          group.filters!.forEach(
            (groupFilter: InfraPathFilterInput | null): void => {
              if (groupFilter != null && groupFilter.query) {
                shouldClause.push({
                  query_string: {
                    analyze_wildcard: true,
                    query: groupFilter.query,
                  },
                });
              }
            }
          );
        }
      }
    );
  }

  if (filterQuery) {
    mustClause.push(filterQuery);
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
