/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useFetcher } from '../../../hooks/use_fetcher';
import type { Environment } from '../../../../common/environment_rt';

/**
 * One POST returns **per-service** alert counts and SLO stats for every service node on the map
 * (same `body.serviceNames` shape as `POST /internal/apm/services/detailed_statistics`).
 * We send all map service names in one request instead of N calls — the response still lists each
 * `serviceName` with its own `alertsCount` / SLO summary for badge merge on each node.
 */
export function useServiceMapBadges({
  serviceNames,
  environment,
  start,
  end,
  kuery,
  enabled,
}: {
  serviceNames: string[];
  environment: Environment;
  start: string;
  end: string;
  kuery: string;
  enabled: boolean;
}) {
  // useFetcher compares `fnDeps` by reference; a new inline array every render re-runs the
  // effect, aborts in-flight requests, and can prevent badges from ever reaching SUCCESS.
  const fetcherDeps = useMemo(
    () => [enabled, serviceNames, start, end, environment, kuery],
    [enabled, serviceNames, start, end, environment, kuery]
  );

  return useFetcher(
    (callApmApi) => {
      if (!enabled || serviceNames.length === 0) {
        return;
      }
      const uniqueSorted = [...new Set(serviceNames)].sort();
      return callApmApi('POST /internal/apm/service-map/service_badges', {
        params: {
          query: {
            start,
            end,
            environment,
            ...(kuery ? { kuery } : {}),
          },
          body: {
            // io-ts `jsonRt.pipe(t.array(t.string))` expects a JSON string (see service inventory
            // `POST /internal/apm/services/detailed_statistics`).
            serviceNames: JSON.stringify(uniqueSorted),
          },
        },
      });
    },
    // useFetcher keys off fnDeps by reference; a new [] each render would re-run the effect and
    // abort in-flight requests (see use_fetcher.tsx). Deps are listed in fetcherDeps' useMemo above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetcherDeps,
    { showToastOnError: false }
  );
}
