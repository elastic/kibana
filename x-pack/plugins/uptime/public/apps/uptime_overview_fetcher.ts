/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchPingHistogram, fetchSnapshotCount } from '../state/api';
import { UptimeFetchDataResponse } from '../../../observability/public';

export async function fetchUptimeOverviewData({
  startTime,
  endTime,
  bucketSize,
}: {
  startTime: string;
  endTime: string;
  bucketSize: string;
}) {
  const snapshot = await fetchSnapshotCount({
    dateRangeStart: startTime,
    dateRangeEnd: endTime,
  });

  const pings = await fetchPingHistogram({ dateStart: startTime, dateEnd: endTime, bucketSize });

  const response: UptimeFetchDataResponse = {
    title: 'Uptime',
    appLink: '/app/uptime#/',
    stats: {
      monitors: {
        type: 'number',
        label: 'Monitors',
        value: snapshot.total,
      },
      up: {
        type: 'number',
        label: 'Up',
        value: snapshot.up,
      },
      down: {
        type: 'number',
        label: 'Down',
        value: snapshot.down,
      },
    },
    series: {
      up: {
        label: 'Up',
        coordinates: pings.histogram.map((p) => {
          return { x: p.x!, y: p.upCount || 0 };
        }),
      },
      down: {
        label: 'Down',
        coordinates: pings.histogram.map((p) => {
          return { x: p.x!, y: p.downCount || 0 };
        }),
      },
    },
  };
  return response;
}
