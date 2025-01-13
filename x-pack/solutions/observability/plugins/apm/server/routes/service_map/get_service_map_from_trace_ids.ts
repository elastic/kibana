/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Connection, ConnectionNode } from '../../../common/service_map';
import { fetchServicePathsFromTraceIds } from './fetch_service_paths_from_trace_ids';
import { getConnectionId } from './transform_service_map_responses';
import type { EsClient } from '../../lib/helpers/get_esql_client';

export function getConnections({ paths }: { paths: ConnectionNode[][] | undefined }): Connection[] {
  if (!paths) {
    return [];
  }

  const connectionsById: Map<string, Connection> = new Map();

  paths.forEach((path) => {
    path.forEach((location, i) => {
      const prev = path[i - 1];

      if (prev) {
        const connection = {
          source: prev,
          destination: location,
        };

        const id = getConnectionId(connection);

        if (!connectionsById.has(id)) {
          connectionsById.set(id, connection);
        }
      }
    });
  });

  return Array.from(connectionsById.values());
}

export async function getServiceMapFromTraceIds({
  traceIds,
  start,
  end,
  index,
  filters,
  logger,
  esqlClient,
  terminateAfter,
}: {
  traceIds: string[];
  start: number;
  end: number;
  logger: Logger;
  esqlClient: EsClient;
  terminateAfter: number;
  index: string[];
  filters: QueryDslQueryContainer[];
}) {
  const serviceMapFromTraceIdsScriptResponse = await fetchServicePathsFromTraceIds({
    traceIds,
    start,
    end,
    esqlClient,
    terminateAfter,
    index,
    filters,
  });

  logger.debug('Received scripted metric agg response');

  return {
    connections: getConnections({
      paths: serviceMapFromTraceIdsScriptResponse?.paths,
    }),
    discoveredServices: serviceMapFromTraceIdsScriptResponse?.discoveredServices ?? [],
  };
}
