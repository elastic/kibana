/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLastXChecks } from './use_last_x_checks';

const fields = ['monitor.duration.us'];

export function useLast50DurationChart({
  monitorId,
  locationId,
  timestamp,
}: {
  monitorId: string;
  timestamp?: string;
  locationId: string;
}) {
  const { hits, loading } = useLastXChecks<{
    'monitor.duration.us': number[] | undefined;
  }>({
    monitorId,
    locationId,
    fields,
    size: 50,
    timestamp,
  });
  const { data, median, min, max, avg } = useMemo(() => {
    if (loading) {
      return {
        data: [],
        median: 0,
        avg: 0,
        min: 0,
        max: 0,
      };
    }

    // calculate min, max, average duration and median

    const coords = hits
      .reverse() // results are returned in desc order by timestamp. Reverse to ensure the data is in asc order by timestamp
      .map((hit, index) => {
        const duration = hit?.['monitor.duration.us']?.[0];
        if (duration === undefined) {
          return null;
        }
        return {
          x: index,
          y: duration,
        };
      })
      .filter((item) => item !== null);

    const sortedByDuration = [...hits].sort(
      (a, b) => (a?.['monitor.duration.us']?.[0] || 0) - (b?.['monitor.duration.us']?.[0] || 0)
    );

    return {
      data: coords as Array<{ x: number; y: number }>,
      median: sortedByDuration[Math.floor(hits.length / 2)]?.['monitor.duration.us']?.[0] || 0,
      avg:
        sortedByDuration.reduce((acc, curr) => acc + (curr?.['monitor.duration.us']?.[0] || 0), 0) /
        hits.length,
      min: sortedByDuration[0]?.['monitor.duration.us']?.[0] || 0,
      max: sortedByDuration[sortedByDuration.length - 1]?.['monitor.duration.us']?.[0] || 0,
    };
  }, [hits, loading]);

  return useMemo(
    () => ({
      data,
      medianDuration: median,
      avgDuration: avg,
      minDuration: min,
      maxDuration: max,
      loading,
    }),
    [data, median, avg, min, max, loading]
  );
}
