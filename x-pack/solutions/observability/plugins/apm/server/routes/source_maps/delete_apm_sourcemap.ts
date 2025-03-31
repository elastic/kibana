/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { APM_SOURCE_MAP_INDEX } from '@kbn/apm-sources-access-plugin/server';

export async function deleteApmSourceMap({
  internalESClient,
  fleetId,
}: {
  internalESClient: ElasticsearchClient;
  fleetId: string;
}) {
  return internalESClient.deleteByQuery({
    index: APM_SOURCE_MAP_INDEX,
    query: {
      bool: {
        filter: [{ term: { fleet_id: fleetId } }],
      },
    },
  });
}
