/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart } from 'kibana/public';
import { UptimeFetchDataResponse, FetchDataParams } from '../../../observability/public';
import { fetchIndexStatus, fetchPingHistogram, fetchSnapshotCount } from '../state/api';
import { kibanaService } from '../state/kibana_service';

async function fetchUptimeOverviewData({
  absoluteTime,
  relativeTime,
  intervalString,
}: FetchDataParams) {
  const start = new Date(absoluteTime.start).toISOString();
  const end = new Date(absoluteTime.end).toISOString();
  const snapshot = await fetchSnapshotCount({
    dateRangeStart: start,
    dateRangeEnd: end,
  });

  const pings = await fetchPingHistogram({
    dateStart: start,
    dateEnd: end,
    bucketSize: intervalString,
  });

  const response: UptimeFetchDataResponse = {
    appLink: `/app/uptime?dateRangeStart=${relativeTime.start}&dateRangeEnd=${relativeTime.end}`,
    stats: {
      monitors: {
        type: 'number',
        value: snapshot.total,
      },
      up: {
        type: 'number',
        value: snapshot.up,
      },
      down: {
        type: 'number',
        value: snapshot.down,
      },
    },
    series: {
      up: {
        coordinates: pings.histogram.map((p) => {
          return { x: p.x!, y: p.upCount || 0 };
        }),
      },
      down: {
        coordinates: pings.histogram.map((p) => {
          return { x: p.x!, y: p.downCount || 0 };
        }),
      },
    },
  };
  return response;
}

export function UptimeDataHelper(coreStart: CoreStart | null) {
  kibanaService.core = coreStart!;

  return {
    indexStatus: fetchIndexStatus,
    overviewData: fetchUptimeOverviewData,
  };
}
