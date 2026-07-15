/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { isActivePlatinumLicense } from '../../../../../common/license_check';
import { invalidLicenseMessage } from '../../../../../common/service_map';
import { useLicenseContext } from '../../../../context/license/use_license_context';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { getServiceMapUrl } from '../../../../embeddable/service_map/get_service_map_url';
import { ServiceMapEmbeddable } from '../../../../embeddable/service_map/service_map_embeddable';
import { LicensePrompt } from '../../../shared/license_prompt';
import { DisabledPrompt } from '../disabled_prompt';
import { ContextualServiceMapControls } from './contextual_service_map_controls';
import {
  CONTEXTUAL_MAP_DEFAULT_BASE_MAX_HOPS,
  CONTEXTUAL_MAP_DEFAULT_MAX_VISIBLE_NODES,
} from './constants';

export const DEFAULT_CONTEXTUAL_SERVICE_MAP_PANEL_HEIGHT = 400;

const SERVICE_MAP_PANEL_TITLE = i18n.translate('xpack.apm.contextualServiceMap.panel.title', {
  defaultMessage: 'Service map',
});

const EXPLORE_IN_SERVICE_MAP_LABEL = i18n.translate(
  'xpack.apm.contextualServiceMap.panel.exploreInServiceMap',
  { defaultMessage: 'Explore in Service map' }
);

export interface ContextualServiceMapSectionProps {
  serviceName: string;
  rangeFrom: string;
  rangeTo: string;
  environment: string;
  kuery: string;
  /** Fixed graph area height when `sectionHeight` is not set. */
  panelHeight?: number;
  /** Fixed outer panel height; map graph fills remaining space below header controls. */
  sectionHeight?: number;
  /** Override embeddable min-height (default 400) for compact inline layouts. */
  embeddableMinHeight?: number;
  sectionTestSubj?: string;
  exploreLinkTestSubj?: string;
  embeddableContainerTestSubj?: string;
}

export function ContextualServiceMapSection({
  serviceName,
  rangeFrom,
  rangeTo,
  environment,
  kuery,
  panelHeight = DEFAULT_CONTEXTUAL_SERVICE_MAP_PANEL_HEIGHT,
  sectionHeight,
  embeddableMinHeight,
  sectionTestSubj = 'apmContextualServiceMapSection',
  exploreLinkTestSubj = 'apmContextualServiceMapExploreInServiceMap',
  embeddableContainerTestSubj = 'apmContextualServiceMapEmbeddableContainer',
}: ContextualServiceMapSectionProps) {
  const license = useLicenseContext();
  const { core, config } = useApmPluginContext();
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

  if (!license) {
    return null;
  }

  const hasValidLicense = isActivePlatinumLicense(license);
  const isServiceMapEnabled = config.serviceMapEnabled;

  if (!hasValidLicense || !isServiceMapEnabled) {
    const unavailablePrompt = isServiceMapEnabled ? (
      <LicensePrompt text={invalidLicenseMessage} />
    ) : (
      <DisabledPrompt />
    );

    return (
      <EuiPanel
        hasBorder
        data-test-subj={sectionTestSubj}
        css={
          sectionHeight !== undefined
            ? {
                height: sectionHeight,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }
            : undefined
        }
      >
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h2>{SERVICE_MAP_PANEL_TITLE}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={{ maxWidth: 600, alignSelf: 'center', width: '100%' }}>
            {unavailablePrompt}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  const fullMapHref = getServiceMapUrl(core, {
    rangeFrom,
    rangeTo,
    environment,
    kuery,
    serviceName,
  });

  const titleRow = (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xs">
          <h2>{SERVICE_MAP_PANEL_TITLE}</h2>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiLink href={fullMapHref} data-test-subj={exploreLinkTestSubj}>
          {EXPLORE_IN_SERVICE_MAP_LABEL}
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

  const controls = (
    <ContextualServiceMapControls
      baseMaxHops={baseMaxHops}
      maxVisibleNodes={maxVisibleNodes}
      onBaseMaxHopsChange={onBaseMaxHopsChange}
      onMaxVisibleNodesChange={onMaxVisibleNodesChange}
      onCollapseAll={resetExpansions}
      hasExpandedNodes={expandedNodeIds.size > 0}
    />
  );

  const mapGraphPanel = (
    <EuiPanel
      hasBorder
      paddingSize="none"
      css={
        sectionHeight !== undefined
          ? { overflow: 'hidden', height: '100%' }
          : { overflow: 'hidden', height: panelHeight }
      }
      data-test-subj={embeddableContainerTestSubj}
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
        embeddableMinHeight={embeddableMinHeight}
      />
    </EuiPanel>
  );

  return (
    <EuiPanel
      hasBorder
      data-test-subj={sectionTestSubj}
      css={
        sectionHeight !== undefined
          ? { height: sectionHeight, display: 'flex', flexDirection: 'column' }
          : undefined
      }
    >
      {sectionHeight !== undefined ? (
        <EuiFlexGroup direction="column" gutterSize="s" css={{ flex: 1, minHeight: 0 }}>
          <EuiFlexItem grow={false}>{titleRow}</EuiFlexItem>
          <EuiFlexItem grow={false}>{controls}</EuiFlexItem>
          <EuiFlexItem grow css={{ minHeight: 0 }}>
            {mapGraphPanel}
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>{titleRow}</EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem grow={false}>{controls}</EuiFlexItem>
              <EuiFlexItem>{mapGraphPanel}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
}
