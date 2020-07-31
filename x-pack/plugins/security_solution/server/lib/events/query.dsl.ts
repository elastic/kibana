/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isEmpty } from 'lodash/fp';

import { SortField, TimerangeInput, DocValueFieldsInput } from '../../graphql/types';
import { createQueryFilterClauses } from '../../utils/build_query';
import { RequestOptions } from '../framework';
import { SortRequest } from '../types';

import { TimerangeFilter } from './types';

export const buildTimelineQuery = (options: RequestOptions) => {
  const { limit, cursor, tiebreaker } = options.pagination;
  const { fields, filterQuery } = options;
  const filterClause = [...createQueryFilterClauses(filterQuery)];
  const defaultIndex = options.defaultIndex;

  const getTimerangeFilter = (timerange: TimerangeInput | undefined): TimerangeFilter[] => {
    if (timerange) {
      const { to, from } = timerange;
      return [
        {
          range: {
            [options.sourceConfiguration.fields.timestamp]: {
              gte: from,
              lte: to,
              format: 'strict_date_optional_time',
            },
          },
        },
      ];
    }
    return [];
  };

  const filter = [...filterClause, ...getTimerangeFilter(options.timerange), { match_all: {} }];

  const getSortField = (sortField: SortField) => {
    if (sortField.sortFieldId) {
      const field: string =
        sortField.sortFieldId === 'timestamp' ? '@timestamp' : sortField.sortFieldId;

      return [
        { [field]: sortField.direction },
        { [options.sourceConfiguration.fields.tiebreaker]: sortField.direction },
      ];
    }
    return [];
  };

  const sort: SortRequest = getSortField(options.sortField!);

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
      ...(isEmpty(options.docValueFields) ? { docvalue_fields: options.docValueFields } : {}),
      query: {
        bool: {
          filter,
        },
      },
      size: limit + 1,
      track_total_hits: true,
      sort,
      _source: fields,
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

export const buildDetailsQuery = (
  indexName: string,
  id: string,
  docValueFields: DocValueFieldsInput[]
) => ({
  allowNoIndices: true,
  index: indexName,
  ignoreUnavailable: true,
  body: {
    docvalue_fields: docValueFields,
    query: {
      terms: {
        _id: [id],
      },
    },
  },
  size: 1,
});
