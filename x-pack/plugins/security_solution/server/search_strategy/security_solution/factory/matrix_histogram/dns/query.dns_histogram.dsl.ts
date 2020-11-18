/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import moment from 'moment';

import { Direction, MatrixHistogramRequestOptions } from '../../../../../../common/search_strategy';
import {
  calculateTimeSeriesInterval,
  createQueryFilterClauses,
} from '../../../../../utils/build_query';

const HUGE_QUERY_SIZE = 1000000;

const getCountAgg = () => ({
  dns_count: {
    cardinality: {
      field: 'dns.question.registered_domain',
    },
  },
});

const createIncludePTRFilter = (isPtrIncluded: boolean) =>
  isPtrIncluded
    ? {}
    : {
        must_not: [
          {
            term: {
              'dns.question.type': {
                value: 'PTR',
              },
            },
          },
        ],
      };

const getHistogramAggregation = ({ from, to }: { from: string; to: string }) => {
  const interval = calculateTimeSeriesInterval(from, to);
  const histogramTimestampField = '@timestamp';

  return {
    date_histogram: {
      field: histogramTimestampField,
      fixed_interval: interval,
      min_doc_count: 0,
      extended_bounds: {
        min: moment(from).valueOf(),
        max: moment(to).valueOf(),
      },
    },
  };
};

export const buildDnsHistogramQuery = ({
  defaultIndex,
  docValueFields,
  filterQuery,
  isPtrIncluded = false,
  stackByField = 'dns.question.registered_domain',
  timerange: { from, to },
}: MatrixHistogramRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        '@timestamp': {
          gte: from,
          lte: to,
          format: 'strict_date_optional_time',
        },
      },
    },
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
      ...(isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
      aggregations: {
        ...getCountAgg(),
        dns_name_query_count: {
          terms: {
            field: stackByField,
            size: HUGE_QUERY_SIZE,
          },
          aggs: {
            dns_question_name: getHistogramAggregation({ from, to }),
            bucket_sort: {
              bucket_sort: {
                sort: [
                  { unique_domains: { order: Direction.desc } },
                  { _key: { order: Direction.asc } },
                ],
                from: 0,
                size: 10,
              },
            },
            unique_domains: {
              cardinality: {
                field: 'dns.question.name',
              },
            },
          },
        },
      },
      query: {
        bool: {
          filter,
          ...createIncludePTRFilter(isPtrIncluded),
        },
      },
    },
    size: 0,
    track_total_hits: false,
  };

  return dslQuery;
};
