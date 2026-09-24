/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { SERVICE_NAME, SPAN_DESTINATION_SERVICE_RESOURCE } from '../../../../common/es_fields/apm';
import { isMessagingExitSpan } from '../../../../common/service_map/get_service_map_nodes';
import type { RequestFlyoutConnection } from '../../shared/request_flyout/types';
import type { ServiceMapEdge as ServiceMapEdgeType } from '../../../../common/service_map';

/**
 * Maps a selected service-map edge to the props the RequestFlyout expects.
 * Returns null when no edge is selected.
 *
 * Modelled on useServiceMapFlyoutProps.ts — same shape, different target.
 */
export function useServiceMapEdgeFlyoutProps({
  selectedEdgeForFlyout,
}: {
  selectedEdgeForFlyout: ServiceMapEdgeType | null;
}): RequestFlyoutConnection | null {
  return useMemo(() => {
    if (!selectedEdgeForFlyout) return null;

    const { sourceData, targetData, sourceLabel, targetLabel, resources, isGrouped } =
      selectedEdgeForFlyout.data ?? {};

    const sourceServiceName =
      sourceData && SERVICE_NAME in sourceData ? sourceData[SERVICE_NAME] : undefined;

    // Multi-resource edges (service→service) carry multiple resources.
    const dependencies = resources ?? [];

    // Single-dependency name: the SPAN_DESTINATION_SERVICE_RESOURCE from the target node.
    const dependencyName =
      targetData && SPAN_DESTINATION_SERVICE_RESOURCE in targetData
        ? targetData[SPAN_DESTINATION_SERVICE_RESOURCE]
        : undefined;

    // Messaging-consumer edges are dependency→service (queue pushes into the service).
    // No metrics are available for these edges — they render the no-metrics message.
    const isMessagingConsumer = isMessagingExitSpan(sourceData);

    if (!sourceServiceName) return null;

    return {
      sourceServiceName,
      sourceLabel: sourceLabel ?? sourceServiceName,
      targetLabel: targetLabel ?? dependencyName ?? selectedEdgeForFlyout.target,
      dependencies,
      dependencyName,
      isGrouped: isGrouped ?? false,
      isMessagingConsumer,
    } satisfies RequestFlyoutConnection;
  }, [selectedEdgeForFlyout]);
}
