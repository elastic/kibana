/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ServiceMapAttachmentData } from '../../../common/agent_builder/attachments';
import { transformTopologyToServiceMap } from '../../../common/agent_builder/attachments/service_map_transform';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import type { Environment } from '../../../common/environment_rt';
import { ContextualServiceMapGraph } from '../../components/app/service_map/contextual_map/contextual_service_map_graph';
import { useContextualServiceMapState } from '../../components/app/service_map/contextual_map/use_contextual_service_map_state';
import { getDateRange } from '../../context/url_params_context/helpers';
import { ApmEmbeddableContext } from '../../embeddable/embeddable_context';
import { getServiceMapUrl } from '../../embeddable/service_map/get_service_map_url';
import type { EmbeddableDeps } from '../../embeddable/types';
import { AgentServiceMap } from './agent_service_map';

/** Matches the `observability.get_service_topology` tool's default range. */
const DEFAULT_RANGE_FROM = 'now-1h';
const DEFAULT_RANGE_TO = 'now';

export interface AgentContextualServiceMapProps {
  data: ServiceMapAttachmentData;
  deps: EmbeddableDeps;
  isSidebar?: boolean;
}

function ContextualMap({
  data,
  deps,
  serviceName,
  isSidebar,
}: AgentContextualServiceMapProps & { serviceName: string }) {
  const rangeFrom = data.timeRange?.start ?? DEFAULT_RANGE_FROM;
  const rangeTo = data.timeRange?.end ?? DEFAULT_RANGE_TO;
  const environment = (data.environment ?? ENVIRONMENT_ALL.value) as Environment;

  const { nodes, edges } = useMemo(() => transformTopologyToServiceMap(data), [data]);

  const contextualState = useContextualServiceMapState({ serviceName });

  const { start, end } = useMemo(() => {
    const { start: parsedStart, end: parsedEnd } = getDateRange({ rangeFrom, rangeTo });
    return { start: parsedStart ?? rangeFrom, end: parsedEnd ?? rangeTo };
  }, [rangeFrom, rangeTo]);

  const fullMapHref = getServiceMapUrl(deps.coreStart, {
    rangeFrom,
    rangeTo,
    environment,
    kuery: '',
    serviceName,
  });

  return (
    <ApmEmbeddableContext
      deps={deps}
      rangeFrom={rangeFrom}
      rangeTo={rangeTo}
      environment={environment}
    >
      <ContextualServiceMapGraph
        height="100%"
        nodes={nodes}
        edges={edges}
        focalServiceId={serviceName}
        baseMaxHops={contextualState.baseMaxHops}
        maxVisibleNodes={contextualState.maxVisibleNodes}
        expandedNodeIds={contextualState.expandedNodeIds}
        onExpand={contextualState.onExpand}
        onCollapse={contextualState.onCollapse}
        onBaseMaxHopsChange={contextualState.onBaseMaxHopsChange}
        onMaxVisibleNodesChange={contextualState.onMaxVisibleNodesChange}
        environment={environment}
        kuery=""
        start={start}
        end={end}
        fullMapHref={fullMapHref}
        showFocusMap
        clearKueryOnPopoverNavigation
        alwaysNavigateOnPopoverFocus
        showContextControls={!isSidebar}
      />
    </ApmEmbeddableContext>
  );
}

/**
 * Renders the `observability.service-map` attachment as the contextual
 * service map (focused on `data.serviceName`, expandable, with popovers and
 * the service flyout), reusing the shared contextual map components.
 *
 * Falls back to the static {@link AgentServiceMap} when the payload has no
 * focal service to center the map on (missing `serviceName`, or a
 * `serviceName` that isn't part of the topology).
 */
export function AgentContextualServiceMap(props: AgentContextualServiceMapProps) {
  const { data } = props;
  const serviceName = data.serviceName;

  const hasFocalService = useMemo(() => {
    if (!serviceName) {
      return false;
    }
    return data.connections.some((connection) =>
      [connection.source, connection.target].some(
        (node) => 'service.name' in node && node['service.name'] === serviceName
      )
    );
  }, [data.connections, serviceName]);

  if (!serviceName || !hasFocalService) {
    return <AgentServiceMap connections={data.connections} nodeMetadata={data.nodeMetadata} />;
  }

  return <ContextualMap {...props} serviceName={serviceName} />;
}
