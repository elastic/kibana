/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Direction,
  FlowTargetSourceDest,
  NetworkTopTablesSortField,
  NetworkTopTablesFields,
} from '../../graphql/types';
import { createQueryFilterClauses } from '../../utils/build_query';
import { assertUnreachable } from '../../../common/utility_types';
import { NetworkTopCountriesRequestOptions } from './index';

const getCountAgg = (flowTarget: FlowTargetSourceDest) => ({
  top_countries_count: {
    cardinality: {
      field: `${flowTarget}.geo.country_iso_code`,
    },
  },
});

export const buildTopCountriesQuery = ({
  defaultIndex,
  filterQuery,
  flowTarget,
  networkTopCountriesSort,
  pagination: { querySize },
  sourceConfiguration: {
    fields: { timestamp },
  },
  timerange: { from, to },
  ip,
}: NetworkTopCountriesRequestOptions) => {
  const filter = [
    ...createQueryFilterClauses(filterQuery),
    {
      range: {
        [timestamp]: { gte: from, lte: to, format: 'strict_date_optional_time' },
      },
    },
  ];

  const dslQuery = {
    allowNoIndices: true,
    index: defaultIndex,
    ignoreUnavailable: true,
    body: {
      aggregations: {
        ...getCountAgg(flowTarget),
        ...getFlowTargetAggs(networkTopCountriesSort, flowTarget, querySize),
      },
      query: {
        bool: ip
          ? {
              filter,
              should: [
                {
                  term: {
                    [`${getOppositeField(flowTarget)}.ip`]: ip,
                  },
                },
              ],
              minimum_should_match: 1,
            }
          : {
              filter,
            },
      },
    },
    size: 0,
    track_total_hits: false,
  };
  return dslQuery;
};

const getFlowTargetAggs = (
  networkTopCountriesSortField: NetworkTopTablesSortField,
  flowTarget: FlowTargetSourceDest,
  querySize: number
) => ({
  [flowTarget]: {
    terms: {
      field: `${flowTarget}.geo.country_iso_code`,
      size: querySize,
      order: {
        ...getQueryOrder(networkTopCountriesSortField),
      },
    },
    aggs: {
      bytes_in: {
        sum: {
          field: `${getOppositeField(flowTarget)}.bytes`,
        },
      },
      bytes_out: {
        sum: {
          field: `${flowTarget}.bytes`,
        },
      },
      flows: {
        cardinality: {
          field: 'network.community_id',
        },
      },
      source_ips: {
        cardinality: {
          field: 'source.ip',
        },
      },
      destination_ips: {
        cardinality: {
          field: 'destination.ip',
        },
      },
    },
  },
});

export const getOppositeField = (flowTarget: FlowTargetSourceDest): FlowTargetSourceDest => {
  switch (flowTarget) {
    case FlowTargetSourceDest.source:
      return FlowTargetSourceDest.destination;
    case FlowTargetSourceDest.destination:
      return FlowTargetSourceDest.source;
  }
  assertUnreachable(flowTarget);
};

type QueryOrder =
  | { bytes_in: Direction }
  | { bytes_out: Direction }
  | { flows: Direction }
  | { destination_ips: Direction }
  | { source_ips: Direction };

const getQueryOrder = (networkTopCountriesSortField: NetworkTopTablesSortField): QueryOrder => {
  switch (networkTopCountriesSortField.field) {
    case NetworkTopTablesFields.bytes_in:
      return { bytes_in: networkTopCountriesSortField.direction };
    case NetworkTopTablesFields.bytes_out:
      return { bytes_out: networkTopCountriesSortField.direction };
    case NetworkTopTablesFields.flows:
      return { flows: networkTopCountriesSortField.direction };
    case NetworkTopTablesFields.destination_ips:
      return { destination_ips: networkTopCountriesSortField.direction };
    case NetworkTopTablesFields.source_ips:
      return { source_ips: networkTopCountriesSortField.direction };
  }
  assertUnreachable(networkTopCountriesSortField.field);
};
