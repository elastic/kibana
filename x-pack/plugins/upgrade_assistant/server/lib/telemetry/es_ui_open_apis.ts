/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Legacy } from 'kibana';

interface UIOpenOption {
  overview: boolean;
  cluster: boolean;
  indices: boolean;
}

export async function upsertUIOpenOption(
  server: Legacy.Server,
  req: Legacy.Request
): Promise<UIOpenOption> {
  const { getSavedObjectsRepository } = server.savedObjects;
  const { callWithInternalUser } = server.plugins.elasticsearch.getCluster('admin');
  const internalRepository = getSavedObjectsRepository(callWithInternalUser);
  const { overview, cluster, indices } = req.payload as UIOpenOption;

  if (overview) {
    await internalRepository.incrementCounter(
      'upgrade-assistant',
      'upgrade-assistant',
      'telemetry.ui_open.overview'
    );
  }

  if (cluster) {
    await internalRepository.incrementCounter(
      'upgrade-assistant',
      'upgrade-assistant',
      'telemetry.ui_open.cluster'
    );
  }

  if (indices) {
    await internalRepository.incrementCounter(
      'upgrade-assistant',
      'upgrade-assistant',
      'telemetry.ui_open.indices'
    );
  }

  return {
    overview,
    cluster,
    indices,
  };
}
