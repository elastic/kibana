/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '../../../../../src/core/server';

export async function getESClusterUuid(client: IScopedClusterClient) {
  const response = await client.asCurrentUser.info({
    filter_path: 'cluster_uuid',
  });
  return response?.cluster_uuid;
}
