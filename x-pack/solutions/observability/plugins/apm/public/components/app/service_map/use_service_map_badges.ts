/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useLicenseContext } from '../../../context/license/use_license_context';
import { isActivePlatinumLicense } from '../../../../common/license_check';
import { isServiceNodeData } from '../../../../common/service_map';
import type { ServiceMapNode } from '../../../../common/service_map';
import type { Environment } from '../../../../common/environment_rt';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { mergeServiceMapNodesWithBadges } from './merge_service_map_nodes_with_badges';

interface ServiceMapBadgesReturn {
  nodes: ServiceMapNode[];
  status: FETCH_STATUS;
}

/**
 * One POST returns **per-service** alert counts and SLO stats for every service node on the map
 * (same `body.serviceNames` shape as `POST /internal/apm/services/detailed_statistics`).
 * We send all map service names in one request instead of N calls — the response still lists each
 * `serviceName` with its own `alertsCount` / SLO summary for badge merge on each node.
 */
export function useServiceMapBadges({
  environment,
  start,
  end,
  kuery,
  nodes,
  nodesStatus,
}: {
  environment: Environment;
  start: string;
  end: string;
  kuery: string;
  nodes: ServiceMapNode[];
  nodesStatus: FETCH_STATUS;
}): ServiceMapBadgesReturn {
  const { config } = useApmPluginContext();
  const license = useLicenseContext();

  const serviceNamesForBadges = useMemo(() => {
    const names = new Set<string>();
    for (const node of nodes) {
      if (isServiceNodeData(node.data)) {
        names.add(node.data.label);
      }
    }
    return [...names].sort();
  }, [nodes]);

  const enabled =
    !!license &&
    isActivePlatinumLicense(license) &&
    config.serviceMapEnabled &&
    nodesStatus === FETCH_STATUS.SUCCESS &&
    serviceNamesForBadges.length > 0;

  // useFetcher compares `fnDeps` by reference; a new inline array every render re-runs the
  // effect, aborts in-flight requests, and can prevent badges from ever reaching SUCCESS.
  const fetcherDeps = useMemo(
    () => [enabled, serviceNamesForBadges, start, end, environment, kuery],
    [enabled, serviceNamesForBadges, start, end, environment, kuery]
  );

  const { data: badgesData, status: badgesStatus } = useFetcher(
    (callApmApi) => {
      if (!enabled) {
        return;
      }
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
            serviceNames: JSON.stringify(serviceNamesForBadges),
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

  return useMemo(() => {
    if (badgesStatus !== FETCH_STATUS.SUCCESS || !badgesData) {
      return { nodes, status: badgesStatus };
    }
    return { nodes: mergeServiceMapNodesWithBadges(nodes, badgesData), status: badgesStatus };
  }, [badgesData, badgesStatus, nodes]);
}
