/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import { FLEET_SERVER_SERVERS_INDEX } from '../../constants';

interface FleetServer {
  agent: {
    id: string;
  };
  host: {
    architecture: string;
    id: string;
    ip: string;
    name: string;
  };
  server: {
    id: string;
    version: string;
  };
  '@timestamp': string;
}

/**
 * Check if at least one fleet server is connected
 */
export async function hasFleetServers(esClient: ElasticsearchClient) {
  const res = await esClient.search<FleetServer, {}>({
    index: FLEET_SERVER_SERVERS_INDEX,
    ignore_unavailable: true,
    filter_path: 'hits.total',
    track_total_hits: true,
    rest_total_hits_as_int: true,
  });

  return (res.hits.total as number) > 0;
}

/**
 * Retrieve first 1,000 Fleet Servers
 */
export async function getFleetServers(esClient: ElasticsearchClient) {
  const res = await esClient.search<FleetServer, {}>({
    index: FLEET_SERVER_SERVERS_INDEX,
    ignore_unavailable: true,
    track_total_hits: true,
    rest_total_hits_as_int: true,
    size: 1000,
  });

  return res.hits;
}
