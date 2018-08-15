/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { omit } from 'lodash';

export async function getKibanaStats(server, callCluster) {
  const { collectorSet } = server.usage;
  const usage = await collectorSet.bulkFetchUsage(callCluster);
  const { kibana, ...rest } = collectorSet.toObject(usage); // TODO everything after this part feels clunky still
  const kibanaForTelemetry = omit(kibana, 'index');

  const usageForTelemetryFull = {
    kibana: {
      count: 1,
      versions: [{ count: 1, version: '7.0.0-alpha1' }], // FIXME
      ...kibanaForTelemetry,
    },
    ...rest,
  };

  return usageForTelemetryFull;
}
