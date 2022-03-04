/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from 'kibana/server';

import { FLEET_SERVER_SERVERS_INDEX } from '../../constants';

/**
 * Check if at least one fleet server is connected
 */
export async function hasFleetServers(esClient: ElasticsearchClient) {
  const res = await esClient.search<{}, {}>({
    index: FLEET_SERVER_SERVERS_INDEX,
    ignore_unavailable: true,
  });

  // @ts-expect-error value is number | TotalHits
  return res.hits.total.value > 0;
}
