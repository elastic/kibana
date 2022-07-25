/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';
import type { JobSpaceOverrides } from '../../sync';
import { logJobsSpaces } from './logs';
import { metricsJobsSpaces } from './metrics';

// create a list of jobs and specific spaces to place them in
// when the are being initialized.
export async function createJobSpaceOverrides(
  clusterClient: IScopedClusterClient
): Promise<JobSpaceOverrides> {
  const spaceOverrides: JobSpaceOverrides = {
    overrides: {
      'anomaly-detector': {},
      'data-frame-analytics': {},
    },
  };
  (await logJobsSpaces(clusterClient)).forEach(
    (o) => (spaceOverrides.overrides['anomaly-detector'][o.id] = [o.space])
  );
  (await metricsJobsSpaces(clusterClient)).forEach(
    (o) => (spaceOverrides.overrides['anomaly-detector'][o.id] = [o.space])
  );
  return spaceOverrides;
}
