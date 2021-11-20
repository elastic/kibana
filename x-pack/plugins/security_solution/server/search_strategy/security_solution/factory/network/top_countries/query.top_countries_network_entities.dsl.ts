/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createQueryFilterClauses } from '../../../../../utils/build_query';
import { assertUnreachable } from '../../../../../../common/utility_types';
import {
  Direction,
  FlowTargetSourceDest,
  NetworkTopTablesFields,
  NetworkTopCountriesRequestOptions,
  SortField,
} from '../../../../../../common/search_strategy';

// TODO: This is the same as the other one, so move this into helpers.
const getCountAgg = (flowTarget: FlowTargetSourceDest) => ({
  top_countries_count: {
    cardinality: {
      field: `${flowTarget}.geo.country_iso_code`,
    },
  },
});

export const buildTopCountriesQueryEntities = ({
  defaultIndex,
  filterQuery,
  flowTarget,
  sort,
  pagination: { querySize },
  timerange: { from, to },
  ip,
}: NetworkTopCountriesRequestOptions) => {
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
    allow_no_indices: true,
    index: defaultIndex,
    ignore_unavailable: true,
    body: {
      aggregations: {
        ...getCountAgg(flowTarget),
        ...getFlowTargetAggs(sort, flowTarget, querySize),
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
  sort: SortField<NetworkTopTablesFields>,
  flowTarget: FlowTargetSourceDest,
  querySize: number
) => ({
  [flowTarget]: {
    terms: {
      field: `${flowTarget}.geo.country_iso_code`,
      size: querySize,
      order: {
        ...getQueryOrder(sort),
      },
    },
    aggs: {
      bytes_in: {
        sum: {
          field: `metrics.${getOppositeField(flowTarget)}.bytes.sum`,
        },
      },
      bytes_out: {
        sum: {
          field: `metrics.${flowTarget}.bytes.sum`,
        },
      },
      flows: {
        // TODO: Should we use max here and/or do a hybrid with a max here for performance?
        avg: {
          field: 'metrics.network.community_id.cardinality',
        },
      },
      source_ips: {
        avg: {
          field: 'metrics.source.ip.cardinality',
        },
      },
      destination_ips: {
        avg: {
          field: 'metrics.destination.ip.cardinality',
        },
      },
    },
  },
});

// TODO: This is the same as the other one, so move this to helpers and use it from there.
export const getOppositeField = (flowTarget: FlowTargetSourceDest): FlowTargetSourceDest => {
  switch (flowTarget) {
    case FlowTargetSourceDest.source:
      return FlowTargetSourceDest.destination;
    case FlowTargetSourceDest.destination:
      return FlowTargetSourceDest.source;
  }
  assertUnreachable(flowTarget);
};

// TODO: This is the same as the other one, so move this to helpers and use it from there.
type QueryOrder =
  | { bytes_in: Direction }
  | { bytes_out: Direction }
  | { flows: Direction }
  | { destination_ips: Direction }
  | { source_ips: Direction };

// TODO: This is the same as the other one, so move this to helpers and use it from there.
const getQueryOrder = (
  networkTopCountriesSortField: SortField<NetworkTopTablesFields>
): QueryOrder => {
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
