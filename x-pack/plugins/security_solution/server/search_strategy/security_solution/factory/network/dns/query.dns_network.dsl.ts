/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from '@elastic/safer-lodash-set';
import { isEmpty } from 'lodash/fp';
import moment from 'moment';

import {
  Direction,
  SortField,
  NetworkDnsRequestOptions,
  NetworkDnsFields,
} from '../../../../../../common/search_strategy';
import {
  calculateTimeSeriesInterval,
  createQueryFilterClauses,
} from '../../../../../utils/build_query';

const HUGE_QUERY_SIZE = 1000000;

type QueryOrder =
  | { _count: { order: Direction } }
  | { _key: { order: Direction } }
  | { unique_domains: { order: Direction } }
  | { dns_bytes_in: { order: Direction } }
  | { dns_bytes_out: { order: Direction } };

const getQueryOrder = (sort: SortField<NetworkDnsFields>): QueryOrder => {
  switch (sort.field) {
    case NetworkDnsFields.queryCount:
      return { _count: { order: sort.direction } };
    case NetworkDnsFields.dnsName:
      return { _key: { order: sort.direction } };
    case NetworkDnsFields.uniqueDomains:
      return { unique_domains: { order: sort.direction } };
    case NetworkDnsFields.dnsBytesIn:
      return { dns_bytes_in: { order: sort.direction } };
    case NetworkDnsFields.dnsBytesOut:
      return { dns_bytes_out: { order: sort.direction } };
  }
};

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

export const buildDnsQuery = ({
  defaultIndex,
  docValueFields,
  filterQuery,
  isPtrIncluded = false,
  isHistogram = false,
  sort = { field: NetworkDnsFields.queryCount, direction: Direction.desc },
  pagination,
  stackByField = 'dns.question.registered_domain',
  timerange: { from, to },
}: NetworkDnsRequestOptions) => {
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
  const { cursorStart, querySize } = pagination ?? {};

  const size = isHistogram
    ? {}
    : {
        size: querySize,
      };

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
            bucket_sort: {
              bucket_sort: {
                sort: [getQueryOrder(sort), { _key: { order: Direction.asc } }],
                from: isHistogram ? 0 : cursorStart,
                ...size,
              },
            },
            unique_domains: {
              cardinality: {
                field: 'dns.question.name',
              },
            },
            dns_bytes_in: {
              sum: {
                field: 'source.bytes',
              },
            },
            dns_bytes_out: {
              sum: {
                field: 'destination.bytes',
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

  return isHistogram
    ? set(
        dslQuery,
        'body.aggregations.dns_name_query_count.aggs.dns_question_name',
        getHistogramAggregation({ from, to })
      )
    : dslQuery;
};
