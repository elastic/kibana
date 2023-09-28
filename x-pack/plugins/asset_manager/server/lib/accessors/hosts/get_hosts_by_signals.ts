/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Asset } from '../../../../common/types_api';
import { GetHostsOptionsInjected } from '.';
import { collectHosts } from '../../collectors/hosts';

export async function getHostsBySignals(
  options: GetHostsOptionsInjected
): Promise<{ hosts: Asset[] }> {
  const metricsIndices = await options.metricsClient.getMetricIndices({
    savedObjectsClient: options.soClient,
  });

  const { assets } = await collectHosts({
    client: options.elasticsearchClient,
    from: options.from,
    to: options.to,
    sourceIndices: {
      metrics: metricsIndices,
      logs: options.sourceIndices.logs,
    },
  });
  return {
    hosts: assets,
  };
}
