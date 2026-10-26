/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiLink, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getEbtProps } from '@kbn/ebt-click';
import type { ServiceMapAttachmentData } from '../../../common/agent_builder/attachments';
import { SERVICE_MAP_ATTACHMENT_DEFAULT_TIME_RANGE } from '../../../common/agent_builder/attachments';
import {
  topologyHasService,
  transformTopologyToServiceMap,
} from '../../../common/agent_builder/attachments/service_map_transform';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import type { Environment } from '../../../common/environment_rt';
import { isActivePlatinumLicense } from '../../../common/license_check';
import { asAbsoluteDateTime } from '../../../common/utils/formatters';
import { APM_EBT_ACTIONS } from '../../components/app/ebt_constants';
import { SERVICE_MAP_EBT_ELEMENTS } from '../../components/app/service_map/ebt_constants';
import { ContextualServiceMapGraph } from '../../components/app/service_map/contextual_map/contextual_service_map_graph';
import { EXPLORE_IN_SERVICE_MAP_LABEL } from '../../components/app/service_map/contextual_map/i18n';
import { useContextualServiceMapState } from '../../components/app/service_map/contextual_map/use_contextual_service_map_state';
import { PopoverFetchOptionsContext } from '../../components/app/service_map/popover/popover_fetch_options_context';
import { useApmPluginContext } from '../../context/apm_plugin/use_apm_plugin_context';
import { useLicenseContext } from '../../context/license/use_license_context';
import { getDateRange } from '../../context/url_params_context/helpers';
import { ApmEmbeddableContext } from '../../embeddable/embeddable_context';
import { getServiceMapUrl } from '../../embeddable/service_map/get_service_map_url';
import type { EmbeddableDeps } from '../../embeddable/types';
import { AgentServiceMap } from './agent_service_map';

const SNAPSHOT_TOOLTIP = i18n.translate(
  'xpack.apm.agentBuilder.attachments.serviceMap.snapshotTimeTooltip',
  {
    defaultMessage:
      'The topology was captured when this response was generated. Opening a service or dependency fetches current data for the time range above.',
  }
);

const POPOVER_FETCH_OPTIONS = { showToastOnError: false };

export interface AgentContextualServiceMapProps {
  data: ServiceMapAttachmentData;
  deps: EmbeddableDeps;
  isSidebar?: boolean;
  /** ISO timestamp of when the agent generated this attachment version. */
  snapshotTime?: string;
}

function ContextualMapContent({
  data,
  serviceName,
  isSidebar,
  environment,
  start,
  end,
  fullMapHref,
  snapshotTime,
}: {
  data: ServiceMapAttachmentData;
  serviceName: string;
  isSidebar?: boolean;
  environment: Environment;
  start: string;
  end: string;
  fullMapHref: string;
  snapshotTime?: string;
}) {
  const { euiTheme } = useEuiTheme();
  const license = useLicenseContext();
  // Optional-chain: the provider is always present in the real renderer, but
  // the default context value is `{}`.
  const config = useApmPluginContext()?.config;

  const { nodes, edges } = useMemo(() => transformTopologyToServiceMap(data), [data]);
  const contextualState = useContextualServiceMapState({ serviceName });

  // Safety net only: Agent Builder itself is Enterprise-gated
  // (`minimumLicense: 'enterprise'` in the agent_builder feature), which is
  // above Platinum, so in practice anyone who can see this attachment can
  // also open the full Service Map. Still gated here so the link never leads
  // to a license prompt if that ever changes, or if the map is disabled in
  // the APM config.
  const showExploreLink = Boolean(
    license && isActivePlatinumLicense(license) && config?.serviceMapEnabled
  );

  const graph = (
    // Popovers render their own empty state, so a failed stats request (e.g. a
    // 403 on a non-platinum license) shouldn't also raise a global error toast.
    <PopoverFetchOptionsContext.Provider value={POPOVER_FETCH_OPTIONS}>
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
        // Intentionally omitted: the labeled header link is the attachment's
        // only full-map entry point, so the graph's toolbar icon stays hidden.
        showFocusMap
        clearKueryOnPopoverNavigation
        alwaysNavigateOnPopoverFocus
        showContextControls={!isSidebar}
      />
    </PopoverFetchOptionsContext.Provider>
  );

  if (!showExploreLink && !snapshotTime) {
    return graph;
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="none" responsive={false} css={{ height: '100%' }}>
      <EuiFlexItem
        grow={false}
        css={{ padding: `${euiTheme.size.s} ${euiTheme.size.s} ${euiTheme.size.xs}` }}
      >
        <EuiFlexGroup
          gutterSize="m"
          alignItems="center"
          justifyContent="flexStart"
          responsive={false}
          // Left-aligned so the content stays visible, and wraps to a second line instead of
          // overflowing in the narrow chat sidebar.
          wrap
        >
          {snapshotTime && (
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="apmAgentServiceMapSnapshotTime">
                {i18n.translate('xpack.apm.agentBuilder.attachments.serviceMap.snapshotTime', {
                  defaultMessage: 'Topology as of {time}',
                  values: { time: asAbsoluteDateTime(snapshotTime, 'minutes') },
                })}{' '}
                <EuiIconTip position="bottom" content={SNAPSHOT_TOOLTIP} type="info" />
              </EuiText>
            </EuiFlexItem>
          )}
          {showExploreLink && (
            <EuiFlexItem grow={false}>
              <EuiLink
                href={fullMapHref}
                target="_blank"
                data-test-subj="apmAgentServiceMapExploreInServiceMap"
                {...getEbtProps({
                  action: APM_EBT_ACTIONS.EXPLORE_SERVICE_MAP,
                  element: SERVICE_MAP_EBT_ELEMENTS.AGENT_ATTACHMENT_LINK,
                })}
              >
                {EXPLORE_IN_SERVICE_MAP_LABEL}
              </EuiLink>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow css={{ minHeight: 0 }}>
        {graph}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

/**
 * Resolves the attachment's time range to the relative range and the absolute
 * start/end the data fetches need. The range is LLM-provided, so an absent or
 * unparseable one falls back to the default instead of reaching the fetches.
 */
function resolveTimeRange(timeRange: ServiceMapAttachmentData['timeRange']) {
  const requested = {
    rangeFrom: timeRange?.start ?? SERVICE_MAP_ATTACHMENT_DEFAULT_TIME_RANGE.start,
    rangeTo: timeRange?.end ?? SERVICE_MAP_ATTACHMENT_DEFAULT_TIME_RANGE.end,
  };
  const parsed = getDateRange(requested);
  if (parsed.start && parsed.end) {
    return { ...requested, start: parsed.start, end: parsed.end };
  }

  const fallback = {
    rangeFrom: SERVICE_MAP_ATTACHMENT_DEFAULT_TIME_RANGE.start,
    rangeTo: SERVICE_MAP_ATTACHMENT_DEFAULT_TIME_RANGE.end,
  };
  const { start, end } = getDateRange(fallback);
  // The default is datemath that always parses; the fallbacks only satisfy the types.
  return { ...fallback, start: start ?? fallback.rangeFrom, end: end ?? fallback.rangeTo };
}

function ContextualMap({
  data,
  deps,
  serviceName,
  isSidebar,
  snapshotTime,
}: AgentContextualServiceMapProps & { serviceName: string }) {
  const environment: Environment = data.environment || ENVIRONMENT_ALL.value;

  const { rangeFrom, rangeTo, start, end } = useMemo(
    () => resolveTimeRange(data.timeRange),
    [data.timeRange]
  );

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
      <ContextualMapContent
        data={data}
        serviceName={serviceName}
        isSidebar={isSidebar}
        environment={environment}
        start={start}
        end={end}
        fullMapHref={fullMapHref}
        snapshotTime={snapshotTime}
      />
    </ApmEmbeddableContext>
  );
}

/**
 * Renders the `observability.service-map` attachment as the contextual
 * service map (focused on `data.serviceName`, expandable, with popovers and
 * the service flyout), reusing the shared contextual map components.
 *
 * Falls back to the static {@link AgentServiceMap} when the user asked for the
 * full topology (`view: 'full'`) or the payload has no focal service to center
 * the map on (missing `serviceName`, or a `serviceName` that isn't part of the
 * topology).
 */
export function AgentContextualServiceMap(props: AgentContextualServiceMapProps) {
  const { data } = props;
  const serviceName = data.serviceName;
  const isFullView = data.view === 'full';

  const hasFocalService = useMemo(
    () => !!serviceName && topologyHasService(data.connections, serviceName),
    [data.connections, serviceName]
  );

  if (isFullView || !serviceName || !hasFocalService) {
    return <AgentServiceMap connections={data.connections} nodeMetadata={data.nodeMetadata} />;
  }

  return <ContextualMap {...props} serviceName={serviceName} />;
}
