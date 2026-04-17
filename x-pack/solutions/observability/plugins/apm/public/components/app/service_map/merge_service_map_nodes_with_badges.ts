/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode } from '../../../../common/service_map';
import { isServiceNodeData } from '../../../../common/service_map';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';

export type ServiceMapBadgesApiResponse =
  APIReturnType<'POST /internal/apm/service-map/service_badges'>;

/**
 * Merges `POST /internal/apm/service-map/service_badges` into service nodes so
 * {@link ServiceNode} can render alert / SLO badges.
 */
export function mergeServiceMapNodesWithBadges(
  nodes: ServiceMapNode[],
  badges: ServiceMapBadgesApiResponse
): ServiceMapNode[] {
  const alertsByService = new Map(
    badges.alerts.map((a) => [a.serviceName, a.alertsCount] as const)
  );
  const slosByService = new Map(badges.slos.map((s) => [s.serviceName, s] as const));

  return nodes.map((node) => {
    if (!isServiceNodeData(node.data)) {
      return node;
    }

    const serviceName = node.data.label;
    const alertsCount = alertsByService.get(serviceName);
    const slo = slosByService.get(serviceName);

    return {
      ...node,
      data: {
        ...node.data,
        ...(alertsCount !== undefined ? { alertsCount } : {}),
        ...(slo ? { sloStatus: slo.sloStatus, sloCount: slo.sloCount } : {}),
      },
    };
  });
}
