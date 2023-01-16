/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { CONNECTORS_JOBS_INDEX } from '../..';
import { ConnectorSyncJob } from '../../../common/types/connectors';
import { Paginate } from '../../../common/types/pagination';
import { isNotNullish } from '../../../common/utils/is_not_nullish';

import { setupConnectorsIndices } from '../../index_management/setup_indices';
import { isIndexNotFoundException } from '../../utils/identify_exceptions';

export const fetchSyncJobsByConnectorId = async (
  client: IScopedClusterClient,
  connectorId: string,
  pageIndex: number,
  size: number
): Promise<Paginate<ConnectorSyncJob>> => {
  try {
    if (size === 0) {
      // prevent some divide by zero errors below
      return {
        data: [],
        has_more_hits_than_total: false,
        pageIndex: 0,
        pageSize: size,
        size: 0,
        total: 0,
      };
    }
    const result = await client.asCurrentUser.search<ConnectorSyncJob>({
      from: pageIndex * size,
      index: CONNECTORS_JOBS_INDEX,
      query: {
        term: {
          'connector.id': connectorId,
        },
      },
      size,
      // @ts-ignore Elasticsearch-js has the wrong internal typing for this field
      sort: { created_at: { order: 'desc' } },
    });
    const total = totalToPaginateTotal(result.hits.total);
    // If we get fewer results than the target page, make sure we return correct page we're on
    const resultPageIndex = Math.min(pageIndex, Math.trunc(total.total / size));
    const data =
      result.hits.hits
        .map((hit) => (hit._source ? { ...hit._source, id: hit._id } : null))
        .filter(isNotNullish) ?? [];
    return {
      data,
      pageIndex: resultPageIndex,
      pageSize: size,
      size: data.length,
      ...total,
    };
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      await setupConnectorsIndices(client.asCurrentUser);
    }
    return {
      data: [],
      has_more_hits_than_total: false,
      pageIndex: 0,
      pageSize: size,
      size: 0,
      total: 0,
    };
  }
};

function totalToPaginateTotal(input: number | SearchTotalHits | undefined): {
  has_more_hits_than_total: boolean;
  total: number;
} {
  if (typeof input === 'number') {
    return { has_more_hits_than_total: false, total: input };
  }
  return input
    ? { has_more_hits_than_total: input.relation === 'gte' ? true : false, total: input.value }
    : { has_more_hits_than_total: false, total: 0 };
}
