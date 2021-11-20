/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { TIEBREAKER_FIELD } from '../../../../common/constants';
import { ANOMALY_THRESHOLD } from '../../../../common/infra_ml';
import { commonSearchSuccessResponseFieldsRT } from '../../../utils/elasticsearch_runtime_types';
import {
  createJobIdsFilters,
  createTimeRangeFilters,
  createResultTypeFilters,
  defaultRequestParameters,
  createAnomalyScoreFilter,
  createInfluencerFilter,
  createJobIdsQuery,
} from './common';
import { InfluencerFilter } from '../common';
import { Sort, Pagination } from '../../../../common/http_api/infra_ml';

const sortToMlFieldMap = {
  dataset: 'partition_field_value',
  anomalyScore: 'record_score',
  startTime: 'timestamp',
};

export const createMetricsK8sAnomaliesQuery = ({
  jobIds,
  anomalyThreshold,
  startTime,
  endTime,
  sort,
  pagination,
  influencerFilter,
  jobQuery,
}: {
  jobIds: string[];
  anomalyThreshold: ANOMALY_THRESHOLD;
  startTime: number;
  endTime: number;
  sort: Sort;
  pagination: Pagination;
  influencerFilter?: InfluencerFilter;
  jobQuery?: string;
}) => {
  const { field } = sort;
  const { pageSize } = pagination;

  let filters: any = [
    ...createJobIdsFilters(jobIds),
    ...createAnomalyScoreFilter(anomalyThreshold),
    ...createTimeRangeFilters(startTime, endTime),
    ...createResultTypeFilters(['record']),
  ];
  if (jobQuery) {
    filters = [...filters, ...createJobIdsQuery(jobQuery)];
  }
  const influencerQuery = influencerFilter
    ? { must: createInfluencerFilter(influencerFilter) }
    : {};

  const sourceFields = [
    'job_id',
    'record_score',
    'typical',
    'actual',
    'partition_field_name',
    'partition_field_value',
    'timestamp',
    'bucket_span',
    'by_field_value',
    'influencers.influencer_field_name',
    'influencers.influencer_field_values',
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
          ...influencerQuery,
        },
      },
      search_after: queryCursor,
      sort: sortOptions,
      size: pageSize,
      _source: sourceFields,
    },
  };

  return resultsQuery;
};

export const metricsK8sAnomalyHitRT = rt.type({
  _id: rt.string,
  _source: rt.intersection([
    rt.type({
      job_id: rt.string,
      record_score: rt.number,
      typical: rt.array(rt.number),
      actual: rt.array(rt.number),
      influencers: rt.array(
        rt.type({
          influencer_field_name: rt.string,
          influencer_field_values: rt.array(rt.string),
        })
      ),
      bucket_span: rt.number,
      timestamp: rt.number,
    }),
    rt.partial({
      partition_field_name: rt.string,
      partition_field_value: rt.string,
      by_field_value: rt.string,
    }),
  ]),
  sort: rt.tuple([rt.union([rt.string, rt.number]), rt.union([rt.string, rt.number])]),
});

export type MetricsK8sAnomalyHit = rt.TypeOf<typeof metricsK8sAnomalyHitRT>;

export const metricsK8sAnomaliesResponseRT = rt.intersection([
  commonSearchSuccessResponseFieldsRT,
  rt.type({
    hits: rt.type({
      hits: rt.array(metricsK8sAnomalyHitRT),
    }),
  }),
]);

export type MetricsK8sAnomaliesResponseRT = rt.TypeOf<typeof metricsK8sAnomaliesResponseRT>;

const parsePaginationCursor = (sort: Sort, pagination: Pagination) => {
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
