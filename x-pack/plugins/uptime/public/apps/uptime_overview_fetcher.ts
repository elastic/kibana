/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchPingHistogram, fetchSnapshotCount } from '../state/api';
import { UptimeFetchDataResponse, FetchDataParams } from '../../../observability/public';

export async function fetchUptimeOverviewData({
  absoluteTime,
  relativeTime,
  bucketSize,
}: FetchDataParams) {
  const start = new Date(absoluteTime.start).toISOString();
  const end = new Date(absoluteTime.end).toISOString();
  const snapshot = await fetchSnapshotCount({
    dateRangeStart: start,
    dateRangeEnd: end,
  });

  const pings = await fetchPingHistogram({ dateStart: start, dateEnd: end, bucketSize });

  const response: UptimeFetchDataResponse = {
    appLink: `/app/uptime#/?dateRangeStart=${relativeTime.start}&dateRangeEnd=${relativeTime.end}`,
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
