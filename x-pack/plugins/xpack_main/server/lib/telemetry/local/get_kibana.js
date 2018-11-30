/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';

/*
 * Check user privileges for read access to monitoring
 * Pass callWithInternalUser to bulkFetchUsage
 */
export async function getKibana(server, callCluster) {
  const { collectorSet } = server.usage;
  const usage = await collectorSet.bulkFetch(callCluster);
  const { kibana, kibana_stats: stats, ...plugins } = collectorSet.toObject(usage);

  const platform = get(stats, 'os.platform');
  const platformRelease = get(stats, 'os.platformRelease');

  // combine core stats (os types, saved objects) with plugin usage stats
  // organize the object into the same format as monitoring-enabled telemetry
  return {
    count: 1,
    indices: 1,
    os: {
      platforms: [{ platform, count: 1 }],
      platformReleases: [{ platformRelease, count: 1 }],
    },
    plugins,
    ...kibana,
  };
}
