/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorPublic } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import type { AssetDetailsLocator } from '@kbn/observability-shared-plugin/common';
import { isOpenTelemetryAgentName } from '../../../../common/agent_name';

interface PodMetricsLinkParams {
  podId: string | null | undefined;
  agentName: string | undefined;
  infraMetricsQuery: { from: string; to: string } | undefined;
  assetDetailsLocator?: AssetDetailsLocator;
  discoverLocator?: LocatorPublic<SerializableRecord>;
  infraLinksAvailable?: boolean;
  metricsIndices?: string;
}

/**
 * Determines the appropriate pod metrics link based on whether the pod is
 * OTel-observed and running on K8s. For OTel-observed K8s pods, returns a
 * Discover link instead of Infra UI link (since Infra UI doesn't support OTel pods).
 */
export function getPodMetricsLink({
  podId,
  agentName,
  infraMetricsQuery,
  assetDetailsLocator,
  discoverLocator,
  infraLinksAvailable = true,
  metricsIndices = 'metrics-*',
}: PodMetricsLinkParams): string | undefined {
  if (!podId) {
    return undefined;
  }

  const isOTelObservedK8sPod = !!agentName && isOpenTelemetryAgentName(agentName);

  // For OTel-observed K8s pods, use Discover link instead of Infra UI
  if (isOTelObservedK8sPod && discoverLocator && infraMetricsQuery) {
    return discoverLocator.getRedirectUrl({
      dataViewSpec: {
        title: metricsIndices,
      },
      timeRange: {
        from: infraMetricsQuery.from,
        to: infraMetricsQuery.to,
      },
      query: {
        language: 'kuery',
        query: `kubernetes.pod.uid: "${podId}"`,
      },
    });
  }

  // For non-OTel pods, use Infra UI if available
  if (infraLinksAvailable && assetDetailsLocator && infraMetricsQuery) {
    return assetDetailsLocator.getRedirectUrl({
      entityId: podId,
      entityType: 'pod',
      assetDetails: { dateRange: infraMetricsQuery },
    });
  }

  return undefined;
}
