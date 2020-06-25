/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';

import { SortField, GetTimelineQuery } from '../../../graphql/types';
import { sourceTimelineFields } from './fields';

export const createQueryFilterClauses = (filterQuery?: string | null) =>
  !isEmpty(filterQuery) ? [filterQuery] : [];

export const buildTimelineQuery = (options: GetTimelineQuery.Variables) => {
  const { limit, cursor, tiebreaker } = options.pagination;
  const { fieldRequested: fields, filterQuery } = options;
  const filterClause = [...createQueryFilterClauses(filterQuery)];
  const defaultIndex = options.defaultIndex;

  const filter = [...filterClause, { match_all: {} }];

  const getSortField = (sortField: SortField) => {
    if (sortField.sortFieldId) {
      const field: string =
        sortField.sortFieldId === 'timestamp' ? '@timestamp' : sortField.sortFieldId;

      return [{ [field]: sortField.direction }, { _doc: sortField.direction }];
    }
    return [];
  };

  const sort = getSortField(options.sortField!);

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
      query: {
        bool: {
          filter,
        },
      },
      size: limit + 1,
      track_total_hits: true,
      sort,
      _source: [...fields, ...sourceTimelineFields],
    },
  };

  if (cursor && tiebreaker) {
    return {
      ...dslQuery,
      body: {
        ...dslQuery.body,
        search_after: [cursor, tiebreaker],
      },
    };
  }

  return dslQuery;
};

export const buildDetailsQuery = (indexName: string, id: string) => ({
  allowNoIndices: true,
  index: indexName,
  ignoreUnavailable: true,
  body: {
    query: {
      terms: {
        _id: [id],
      },
    },
  },
  size: 1,
});
