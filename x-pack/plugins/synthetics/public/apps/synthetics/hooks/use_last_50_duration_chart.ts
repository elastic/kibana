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
}: {
  monitorId: string;
  locationId: string;
}) {
  const { hits, loading } = useLastXChecks<{
    'monitor.duration.us': number[] | undefined;
  }>({
    monitorId,
    locationId,
    fields,
    size: 50,
  });
  const { data, averageDuration } = useMemo(() => {
    if (loading) {
      return {
        data: [],
        averageDuration: 0,
      };
    }
    let totalDuration = 0;

    const coords = hits
      .reverse() // results are returned in desc order by timestamp. Reverse to ensure the data is in asc order by timestamp
      .map((hit, index) => {
        const duration = hit?.['monitor.duration.us']?.[0];
        totalDuration += duration || 0;
        if (duration === undefined) {
          return null;
        }
        return {
          x: index,
          y: duration,
        };
      })
      .filter((item) => item !== null);

    return {
      data: coords as Array<{ x: number; y: number }>,
      averageDuration: totalDuration / coords.length,
    };
  }, [hits, loading]);

  return useMemo(
    () => ({
      data,
      averageDuration,
      loading,
    }),
    [loading, data, averageDuration]
  );
}
