/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import moment from 'moment';
import { OpsMetrics } from 'kibana/server';
import { KIBANA_STATS_TYPE_MONITORING } from '../../../common/constants';

/*
 * Initialize a collector for Kibana Ops Stats
 */
export function getOpsStatsCollector(usageCollection: any, metrics$: Observable<OpsMetrics>) {
  let lastMetrics: OpsMetrics | null = null;
  metrics$.subscribe(metrics => {
    lastMetrics = metrics;
  });

  return usageCollection.makeStatsCollector({
    type: KIBANA_STATS_TYPE_MONITORING,
    isReady: () => !!lastMetrics,
    fetch: () => ({
      ...lastMetrics,
      timestamp: moment.utc().toISOString(),
    }),
  });
}
