/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import { ISearchRequestParams } from '../../../../../../../../src/plugins/data/common';
import {
  Direction,
  AgentsRequestOptions,
  SortField,
  // HostsFields,
} from '../../../../../common/search_strategy';
import { createQueryFilterClauses } from '../../../../../common/utils/build_query';
// import { assertUnreachable } from '../../../../../common/utility_types';

export const buildAgentsQuery = ({
  docValueFields,
  filterQuery,
  pagination: { querySize },
  sort,
}: AgentsRequestOptions): ISearchRequestParams => {
  const filter = [...createQueryFilterClauses(filterQuery)];

  const agg = { host_count: { cardinality: { field: 'host.name' } } };

  const dslQuery = {
    allowNoIndices: true,
    index: '.fleet-agents',
    ignoreUnavailable: true,
    body: {
      ...(!isEmpty(docValueFields) ? { docvalue_fields: docValueFields } : {}),
      // aggregations: {
      //   ...agg,
      //   host_data: {
      //     terms: { size: querySize, field: 'host.name', order: getQueryOrder(sort) },
      //     aggs: {
      //       lastSeen: { max: { field: '@timestamp' } },
      //       os: {
      //         top_hits: {
      //           size: 1,
      //           sort: [
      //             {
      //               '@timestamp': {
      //                 order: 'desc',
      //               },
      //             },
      //           ],
      //           _source: {
      //             includes: ['host.os.*'],
      //           },
      //         },
      //       },
      //     },
      //   },
      // },
      query: { bool: { filter } },
      // size: 0,
      track_total_hits: true,
    },
  };

  return dslQuery;
};

// type QueryOrder = { lastSeen: Direction } | { _key: Direction };

// const getQueryOrder = (sort: SortField<HostsFields>): QueryOrder => {
//   switch (sort.field) {
//     case HostsFields.lastSeen:
//       return { lastSeen: sort.direction };
//     case HostsFields.hostName:
//       return { _key: sort.direction };
//     default:
//       return assertUnreachable(sort.field as never);
//   }
// };
