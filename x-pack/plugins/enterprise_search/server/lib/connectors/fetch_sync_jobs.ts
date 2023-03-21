/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core-elasticsearch-server';

import { CONNECTORS_JOBS_INDEX } from '../..';
import { ConnectorSyncJob } from '../../../common/types/connectors';
import { Paginate } from '../../../common/types/pagination';
import { isNotNullish } from '../../../common/utils/is_not_nullish';

import { setupConnectorsIndices } from '../../index_management/setup_indices';
import { fetchWithPagination } from '../../utils/fetch_with_pagination';
import { isIndexNotFoundException } from '../../utils/identify_exceptions';

const defaultResult: Paginate<ConnectorSyncJob> = {
  _meta: {
    page: {
      from: 0,
      has_more_hits_than_total: false,
      size: 10,
      total: 0,
    },
  },
  data: [],
};

export const fetchSyncJobsByConnectorId = async (
  client: IScopedClusterClient,
  connectorId: string,
  from: number,
  size: number
): Promise<Paginate<ConnectorSyncJob>> => {
  try {
    const result = await fetchWithPagination(
      async () =>
        await client.asCurrentUser.search<ConnectorSyncJob>({
          from,
          index: CONNECTORS_JOBS_INDEX,
          query: {
            term: {
              'connector.id': connectorId,
            },
          },
          size,
          sort: { created_at: { order: 'desc' } },
        }),
      from,
      size
    );
    return {
      ...result,
      data: result.data
        .map((hit) => (hit._source ? { ...hit._source, id: hit._id } : null))
        .filter(isNotNullish),
    };
  } catch (error) {
    if (isIndexNotFoundException(error)) {
      await setupConnectorsIndices(client.asCurrentUser);
      return defaultResult;
    } else {
      throw error;
    }
  }
};
