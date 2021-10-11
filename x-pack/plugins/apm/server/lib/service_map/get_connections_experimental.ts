/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { APMEventClient } from '../helpers/create_es_client/create_apm_event_client';
import { fetchConnectionsExperimental } from './get_connections_experimental/fetch_connections_experimental';
import { transformConnectionsExperimental } from './get_connections_experimental/transform_connections_experimental';

export async function getConnectionsExperimental({
  serviceName,
  environment,
  start,
  end,
  apmEventClient,
}: {
  serviceName?: string;
  environment?: string;
  start: number;
  end: number;
  apmEventClient: APMEventClient;
}) {
  const connections = transformConnectionsExperimental({
    serviceName,
    environment,
    start,
    end,
    ...(await fetchConnectionsExperimental({
      start,
      end,
      apmEventClient,
    })),
  });

  return {
    connections,
    discoveredServices: [],
  };
}
