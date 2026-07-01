/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useApmServiceContext } from '../../../../context/apm_service/use_apm_service_context';
import { useApmParams } from '../../../../hooks/use_apm_params';
import { getServiceMapUrl } from '../../../../embeddable/service_map/get_service_map_url';
import { ServiceMapEmbeddable } from '../../../../embeddable/service_map/service_map_embeddable';
import { ContextualServiceMapControls } from '../../service_map/contextual_map/contextual_service_map_controls';
import {
  CONTEXTUAL_MAP_DEFAULT_BASE_MAX_HOPS,
  CONTEXTUAL_MAP_DEFAULT_MAX_VISIBLE_NODES,
} from '../../service_map/contextual_map/constants';

const SERVICE_MAP_PANEL_HEIGHT = 400;

const SERVICE_MAP_PANEL_TITLE = i18n.translate('xpack.apm.serviceOverview.serviceMapPanel.title', {
  defaultMessage: 'Service map',
});

const EXPLORE_IN_SERVICE_MAP_LABEL = i18n.translate(
  'xpack.apm.serviceOverview.serviceMapPanel.exploreInServiceMap',
  { defaultMessage: 'Explore in Service map' }
);

export function ServiceOverviewServiceMapSection() {
  const { core } = useApmPluginContext();
  const { serviceName } = useApmServiceContext();
  const {
    query: { environment, kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}/overview');
  const [baseMaxHops, setBaseMaxHops] = useState(CONTEXTUAL_MAP_DEFAULT_BASE_MAX_HOPS);
  const [maxVisibleNodes, setMaxVisibleNodes] = useState(CONTEXTUAL_MAP_DEFAULT_MAX_VISIBLE_NODES);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set());

  const resetExpansions = useCallback(() => {
    setExpandedNodeIds(new Set());
  }, []);

  const onExpand = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
  }, []);

  const onCollapse = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  const onBaseMaxHopsChange = useCallback(
    (value: number) => {
      setBaseMaxHops(value);
      resetExpansions();
    },
    [resetExpansions]
  );

  const onMaxVisibleNodesChange = useCallback(
    (value: number) => {
      setMaxVisibleNodes(value);
      resetExpansions();
    },
    [resetExpansions]
  );

  useEffect(() => {
    resetExpansions();
  }, [serviceName, resetExpansions]);

  if (!serviceName) {
    return null;
  }

  const fullMapHref = getServiceMapUrl(core, {
    rangeFrom,
    rangeTo,
    environment,
    kuery,
    serviceName,
  });

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj="apmServiceOverviewServiceMapSection">
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{SERVICE_MAP_PANEL_TITLE}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                color="primary"
                href={fullMapHref}
                data-test-subj="apmServiceOverviewExploreInServiceMap"
              >
                {EXPLORE_IN_SERVICE_MAP_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem>
          <ContextualServiceMapControls
            baseMaxHops={baseMaxHops}
            maxVisibleNodes={maxVisibleNodes}
            onBaseMaxHopsChange={onBaseMaxHopsChange}
            onMaxVisibleNodesChange={onMaxVisibleNodesChange}
            onCollapseAll={resetExpansions}
            hasExpandedNodes={expandedNodeIds.size > 0}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiPanel
            hasBorder
            paddingSize="none"
            css={{ overflow: 'hidden', height: SERVICE_MAP_PANEL_HEIGHT }}
            data-test-subj="apmServiceOverviewServiceMapEmbeddableContainer"
          >
            <ServiceMapEmbeddable
              rangeFrom={rangeFrom}
              rangeTo={rangeTo}
              environment={environment}
              kuery={kuery}
              serviceName={serviceName}
              core={core}
              enableContextualMap
              contextualMapBaseMaxHops={baseMaxHops}
              contextualMapMaxVisibleNodes={maxVisibleNodes}
              onContextualMapBaseMaxHopsChange={onBaseMaxHopsChange}
              onContextualMapMaxVisibleNodesChange={onMaxVisibleNodesChange}
              contextualMapExpandedNodeIds={expandedNodeIds}
              onContextualMapExpand={onExpand}
              onContextualMapCollapse={onCollapse}
              hideContextControls
              showFocusMapInPopover
              clearKueryOnPopoverNavigation
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
