/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { cloneDeep } from 'lodash';
import moment from 'moment';
import { OpsMetrics } from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { KIBANA_STATS_TYPE_MONITORING } from '../../../common/constants';

interface MonitoringOpsMetrics extends OpsMetrics {
  timestamp: string;
}

/*
 * Initialize a collector for Kibana Ops Stats
 */
export function getOpsStatsCollector(
  usageCollection: UsageCollectionSetup,
  metrics$: Observable<OpsMetrics>
) {
  let lastMetrics: MonitoringOpsMetrics | null = null;
  metrics$.subscribe(_metrics => {
    const metrics: any = cloneDeep(_metrics);
    // Ensure we only include the same data that Metricbeat collection would get
    delete metrics.process.pid;
    metrics.response_times = {
      average: metrics.response_times.avg_in_millis,
      max: metrics.response_times.max_in_millis,
    };
    delete metrics.requests.statusCodes;
    lastMetrics = {
      ...metrics,
      timestamp: moment.utc().toISOString(),
    };
  });

  return usageCollection.makeStatsCollector({
    type: KIBANA_STATS_TYPE_MONITORING,
    isReady: () => !!lastMetrics,
    fetch: () => lastMetrics,
  });
}
