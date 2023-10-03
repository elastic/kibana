/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetHostsOptionsInjected } from './shared_types';
import { Asset } from '../../../../common/types_api';
import { collectHosts } from '../../collectors/hosts';

export async function getHosts(options: GetHostsOptionsInjected): Promise<{ hosts: Asset[] }> {
  const metricsIndices = await options.metricsClient.getMetricIndices({
    savedObjectsClient: options.savedObjectsClient,
  });

  const { assets } = await collectHosts({
    client: options.elasticsearchClient,
    from: options.from,
    to: options.to || 'now',
    sourceIndices: {
      metrics: metricsIndices,
      logs: options.sourceIndices.logs,
    },
  });
  return {
    hosts: assets,
  };
}
