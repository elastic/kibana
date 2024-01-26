/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISearchRequestParams } from '@kbn/data-plugin/common';
import { isEmpty } from 'lodash';
import moment from 'moment/moment';
import { getQueryFilter } from '../../../../utils/build_query';
import { OSQUERY_INTEGRATION_NAME } from '../../../../../common';
import type { ResultsRequestOptions } from '../../../../../common/search_strategy';

export const buildResultsQuery = ({
  actionId,
  agentId,
  kuery,
  sort,
  startDate,
  pagination: { activePage, querySize },
}: ResultsRequestOptions): ISearchRequestParams => {
  const actionIdQuery = `action_id: ${actionId}`;
  const agentQuery = agentId ? ` AND agent.id: ${agentId}` : '';
  let filter = actionIdQuery + agentQuery;
  if (!isEmpty(kuery)) {
    filter = filter + ` AND ${kuery}`;
  }

  const timeRangeFilter =
    startDate && !isEmpty(startDate)
      ? [
          {
            range: {
              '@timestamp': {
                gte: startDate,
                lte: moment(startDate).clone().add(30, 'minutes').toISOString(),
              },
            },
          },
        ]
      : [];
  const filterQuery = [...timeRangeFilter, getQueryFilter({ filter })];

  return {
    allow_no_indices: true,
    index: `logs-${OSQUERY_INTEGRATION_NAME}.result*`,
    ignore_unavailable: true,
    body: {
      aggs: {
        count_by_agent_id: {
          terms: {
            field: 'elastic_agent.id',
            size: 10000,
          },
        },
        unique_agents: {
          cardinality: {
            field: 'elastic_agent.id',
          },
        },
      },
      query: { bool: { filter: filterQuery } },
      from: activePage * querySize,
      size: querySize,
      track_total_hits: true,
      fields: ['elastic_agent.*', 'agent.*', 'osquery.*'],
      sort:
        sort?.map((sortConfig) => ({
          [sortConfig.field]: {
            order: sortConfig.direction,
          },
        })) ?? [],
    },
  };
};
