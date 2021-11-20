/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { commonSearchSuccessResponseFieldsRT } from '../../../utils/elasticsearch_runtime_types';
import {
  createJobIdsFilters,
  createTimeRangeFilters,
  createResultTypeFilters,
  defaultRequestParameters,
  createDatasetsFilters,
} from './common';
import {
  AnomaliesSort,
  LogEntryAnomalyDatasets,
  Pagination,
} from '../../../../common/log_analysis';

// TODO: Reassess validity of this against ML docs
const TIEBREAKER_FIELD = '_doc';

const sortToMlFieldMap = {
  dataset: 'partition_field_value',
  anomalyScore: 'record_score',
  startTime: 'timestamp',
};

export const createLogEntryAnomaliesQuery = (
  jobIds: string[],
  startTime: number,
  endTime: number,
  sort: AnomaliesSort,
  pagination: Pagination,
  datasets?: LogEntryAnomalyDatasets
) => {
  const { field } = sort;
  const { pageSize } = pagination;

  const filters = [
    ...createJobIdsFilters(jobIds),
    ...createTimeRangeFilters(startTime, endTime),
    ...createResultTypeFilters(['record']),
    ...createDatasetsFilters(datasets),
  ];

  const fields = [
    'job_id',
    'record_score',
    'typical',
    'actual',
    'partition_field_value',
    {
      field: 'timestamp',
      format: 'epoch_millis',
    },
    'bucket_span',
    'by_field_value',
  ];

  const { querySortDirection, queryCursor } = parsePaginationCursor(sort, pagination);

  const sortOptions = [
    { [sortToMlFieldMap[field]]: querySortDirection },
    { [TIEBREAKER_FIELD]: querySortDirection }, // Tiebreaker
  ];

  const resultsQuery = {
    ...defaultRequestParameters,
    body: {
      query: {
        bool: {
          filter: filters,
        },
      },
      search_after: queryCursor,
      sort: sortOptions,
      size: pageSize,
      _source: false,
      fields,
    },
  };

  return resultsQuery;
};

export const logEntryAnomalyHitRT = rt.type({
  _id: rt.string,
  fields: rt.intersection([
    rt.type({
      job_id: rt.array(rt.string),
      record_score: rt.array(rt.number),
      typical: rt.array(rt.number),
      actual: rt.array(rt.number),
      partition_field_value: rt.array(rt.string),
      bucket_span: rt.array(rt.number),
      timestamp: rt.array(rt.string),
    }),
    rt.partial({
      by_field_value: rt.array(rt.string),
    }),
  ]),
  sort: rt.tuple([rt.union([rt.string, rt.number]), rt.union([rt.string, rt.number])]),
});

export type LogEntryAnomalyHit = rt.TypeOf<typeof logEntryAnomalyHitRT>;

export const logEntryAnomaliesResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.type({
    hits: rt.type({
      hits: rt.array(logEntryAnomalyHitRT),
    }),
  }),
]);

export type LogEntryAnomaliesResponseRT = rt.TypeOf<typeof logEntryAnomaliesResponseRT>;

const parsePaginationCursor = (sort: AnomaliesSort, pagination: Pagination) => {
  const { cursor } = pagination;
  const { direction } = sort;

  if (!cursor) {
    return { querySortDirection: direction, queryCursor: undefined };
  }

  // We will always use ES's search_after to paginate, to mimic "search_before" behaviour we
  // need to reverse the user's chosen search direction for the ES query.
  if ('searchBefore' in cursor) {
    return {
      querySortDirection: direction === 'desc' ? 'asc' : 'desc',
      queryCursor: cursor.searchBefore,
    };
  } else {
    return { querySortDirection: direction, queryCursor: cursor.searchAfter };
  }
};
