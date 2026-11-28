/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_CONNECTION_RESOURCES } from '@kbn/apm-api-shared';
import { i18n } from '@kbn/i18n';
import { useMemo } from 'react';
import { SERVICE_NAME, SPAN_DESTINATION_SERVICE_RESOURCE } from '../../../../common/es_fields/apm';
import { isMessagingExitSpan } from '../../../../common/service_map/get_service_map_nodes';
import { getEdgeMetrics } from '../../../../common/agent_builder/attachments/service_map_transform';
import type { ServiceMapEdge as ServiceMapEdgeType } from '../../../../common/service_map';
import type {
  RequestFlyoutConnection,
  RequestFlyoutNoMetricsConnection,
} from '../../shared/request_flyout/types';

/**
 * The connection the request flyout shows for a selected edge: null when no edge is selected or
 * the edge cannot open a flyout, a connection without metrics for the edges that have none
 * (the source is a messaging queue, or a group of resources).
 */
export function useServiceMapEdgeFlyoutProps({
  selectedEdgeForFlyout,
}: {
  selectedEdgeForFlyout: ServiceMapEdgeType | null;
}): RequestFlyoutConnection | RequestFlyoutNoMetricsConnection | null {
  return useMemo(() => {
    if (!selectedEdgeForFlyout) {
      return null;
    }

    const { sourceData, targetData, sourceLabel, targetLabel, resources, isGrouped } =
      selectedEdgeForFlyout.data ?? {};
    const groupedConnections = selectedEdgeForFlyout.data?.groupedConnections;

    // Edge to an "N resources" node: the source is the service node itself.
    if (isGrouped && groupedConnections?.length) {
      const groupedResources = groupedConnections.map((connection) => ({
        resource: connection[SPAN_DESTINATION_SERVICE_RESOURCE] ?? connection.label,
        spanType: connection.spanType,
        spanSubtype: connection.spanSubtype,
      }));
      const { spanType, spanSubtype } = groupedResources[0];
      return {
        sourceServiceName: selectedEdgeForFlyout.source,
        sourceLabel: selectedEdgeForFlyout.source,
        targetLabel: i18n
          .translate('xpack.apm.requestFlyout.groupedTargetLabel', {
            defaultMessage: '{count} {type} resources',
            values: { count: groupedResources.length, type: spanSubtype ?? spanType ?? '' },
          })
          .replace(/\s+/g, ' '),
        // The routes cap the resources: a very large group is trimmed to the first ones.
        dependencies: groupedResources
          .slice(0, MAX_CONNECTION_RESOURCES)
          .map(({ resource }) => resource),
        groupedResources,
      };
    }

    const sourceServiceName =
      sourceData && SERVICE_NAME in sourceData ? sourceData[SERVICE_NAME] : undefined;
    const targetServiceName =
      targetData && SERVICE_NAME in targetData ? targetData[SERVICE_NAME] : undefined;
    const dependencyName =
      targetData && SPAN_DESTINATION_SERVICE_RESOURCE in targetData
        ? targetData[SPAN_DESTINATION_SERVICE_RESOURCE]
        : undefined;

    const labels = {
      sourceLabel: sourceLabel ?? sourceServiceName ?? selectedEdgeForFlyout.source,
      targetLabel:
        targetLabel ?? targetServiceName ?? dependencyName ?? selectedEdgeForFlyout.target,
    };

    // Edges from a queue, or from a group of resources, have no exit spans to measure.
    if (isGrouped || isMessagingExitSpan(sourceData)) {
      return labels;
    }

    if (!sourceServiceName) {
      return null;
    }

    const dependencies = resources?.length
      ? resources.slice(0, MAX_CONNECTION_RESOURCES)
      : dependencyName
        ? [dependencyName]
        : [];

    return {
      sourceServiceName,
      ...labels,
      dependencies,
      targetServiceName,
      dependencyName,
      payloadMetrics: dependencies.length === 0 ? getEdgeMetrics(selectedEdgeForFlyout) : undefined,
    };
  }, [selectedEdgeForFlyout]);
}
