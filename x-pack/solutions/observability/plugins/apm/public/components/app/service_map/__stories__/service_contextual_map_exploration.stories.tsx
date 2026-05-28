/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Exploration stories for service-contextual map options (observability-dev#5453).
 * Compare approaches before implementing in production (#5428).
 *
 * Run: yarn storybook apm → app/ServiceMap/ServiceContextualMapExploration
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonGroup,
  EuiCallOut,
  EuiComboBox,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { ServiceMapGraph } from '../graph';
import { CollapsibleServiceMapGraph } from './collapsible_service_map_graph';
import {
  createLargeServiceMap,
  createMicroservicesExample,
  createSimpleServiceMap,
} from './generate_elements';
import {
  CONTEXTUAL_MAP_DEFAULT_MAX_VISIBLE_NODES,
  createChainServiceMap,
  createRichContextualServiceMap,
  filterServiceMapByHopDepth,
  countVisibleServices,
} from './service_contextual_map_utils';
import {
  DEFAULT_SERVICE_MAP_VIEW_FILTERS,
  type ServiceMapViewFilters,
} from '../apply_service_map_visibility';

const defaultEnvironment = 'ENVIRONMENT_ALL' as const;
const defaultTimeRange = {
  start: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  end: new Date().toISOString(),
};

function getHeight() {
  return window.innerHeight - 220;
}

function HopDepthExplorationPanel() {
  const [viewMode, setViewMode] = useState<'full' | 'hop-limited'>('hop-limited');
  const [maxHops, setMaxHops] = useState(1);
  const [chainLength, setChainLength] = useState(8);

  const {
    nodes: fullNodes,
    edges: fullEdges,
    focalServiceId,
  } = useMemo(() => createChainServiceMap(chainLength), [chainLength]);

  const {
    nodes: displayNodes,
    edges: displayEdges,
    hopDepth,
  } = useMemo(() => {
    if (viewMode === 'full') {
      return {
        nodes: fullNodes,
        edges: fullEdges,
        hopDepth: null,
      };
    }
    return filterServiceMapByHopDepth({
      focalNodeId: focalServiceId,
      maxHops,
      nodes: fullNodes,
      edges: fullEdges,
    });
  }, [viewMode, maxHops, fullNodes, fullEdges, focalServiceId]);

  const hiddenIndicators = hopDepth ? [...hopDepth.hiddenNeighborCountByNodeId.entries()] : [];

  return (
    <div style={{ padding: 16 }}>
      <EuiTitle size="s">
        <h2>Option A: Hop-depth collapse (issue hypothesis)</h2>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>
          Show only nodes within N hops of the focal service. Hidden direct neighbors are listed
          below — a future UI might show these as badges on nodes or expandable placeholders.
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup wrap alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend="View mode"
            options={[
              { id: 'hop-limited', label: 'Hop-limited' },
              { id: 'full', label: 'Full map (baseline)' },
            ]}
            idSelected={viewMode}
            onChange={(id) => setViewMode(id as 'full' | 'hop-limited')}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFieldNumber
            data-test-subj="hopDepthMaxHops"
            prepend="Max hops"
            value={maxHops}
            min={0}
            max={20}
            disabled={viewMode === 'full'}
            onChange={(e) => setMaxHops(e.target.valueAsNumber || 0)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFieldNumber
            data-test-subj="hopDepthChainLength"
            prepend="Chain length"
            value={chainLength}
            min={2}
            max={30}
            onChange={(e) => setChainLength(e.target.valueAsNumber || 2)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">Focal: {focalServiceId}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiCallOut size="s" title="Visibility stats" iconType="visMapCoordinate">
        <p>
          Visible services: {countVisibleServices(displayNodes)} / {countVisibleServices(fullNodes)}{' '}
          · Total nodes shown: {displayNodes.length} / {fullNodes.length}
          {hopDepth ? ` · Hidden: ${hopDepth.totalHiddenCount}` : ''}
        </p>
        {hiddenIndicators.length > 0 && (
          <p>
            Nodes with hidden neighbors:{' '}
            {hiddenIndicators.map(([id, count]) => `${id} (+${count})`).join(', ')}
          </p>
        )}
      </EuiCallOut>

      <EuiSpacer size="m" />

      <ServiceMapGraph
        height={getHeight()}
        nodes={displayNodes}
        edges={displayEdges}
        environment={defaultEnvironment}
        kuery=""
        start={defaultTimeRange.start}
        end={defaultTimeRange.end}
        highlightedServiceName={focalServiceId}
      />
    </div>
  );
}

function LargeMapHopDepthPanel() {
  const { nodes: fullNodes, edges: fullEdges } = useMemo(() => createLargeServiceMap(40), []);

  const serviceOptions = useMemo(
    () => fullNodes.filter((n) => n.type === 'service').map((n) => ({ label: n.id, value: n.id })),
    [fullNodes]
  );

  const [focalServiceId, setFocalServiceId] = useState(
    () => serviceOptions[0]?.value ?? 'api-gateway'
  );
  const [maxHops, setMaxHops] = useState(2);

  const { nodes, edges, hopDepth } = useMemo(
    () =>
      filterServiceMapByHopDepth({
        focalNodeId: focalServiceId,
        maxHops,
        nodes: fullNodes,
        edges: fullEdges,
      }),
    [focalServiceId, maxHops, fullNodes, fullEdges]
  );

  return (
    <div style={{ padding: 16 }}>
      <EuiTitle size="s">
        <h2>Option A on a dense map (40 services)</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGroup wrap alignItems="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiComboBox
            aria-label="Focal service"
            singleSelection={{ asPlainText: true }}
            options={serviceOptions}
            selectedOptions={serviceOptions.filter((o) => o.value === focalServiceId)}
            onChange={(selected) => {
              const next = selected[0]?.value;
              if (next) {
                setFocalServiceId(next);
              }
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFieldNumber
            data-test-subj="largeMapHopDepthMaxHops"
            prepend="Max hops"
            value={maxHops}
            min={0}
            max={10}
            onChange={(e) => setMaxHops(e.target.valueAsNumber || 0)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiCallOut
        size="s"
        title={`${hopDepth.totalHiddenCount} nodes hidden · ${countVisibleServices(
          nodes
        )} services visible`}
      />
      <EuiSpacer size="m" />
      <ServiceMapGraph
        height={getHeight()}
        nodes={nodes}
        edges={edges}
        environment={defaultEnvironment}
        kuery=""
        start={defaultTimeRange.start}
        end={defaultTimeRange.end}
        highlightedServiceName={focalServiceId}
      />
    </div>
  );
}

function ExpandCollapseExplorationPanel() {
  const [useChainTopology, setUseChainTopology] = useState(false);
  const [baseMaxHops, setBaseMaxHops] = useState(1);
  const [maxVisibleNodes, setMaxVisibleNodes] = useState(CONTEXTUAL_MAP_DEFAULT_MAX_VISIBLE_NODES);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(() => new Set());
  const [viewFilters, setViewFilters] = useState<ServiceMapViewFilters>(
    DEFAULT_SERVICE_MAP_VIEW_FILTERS
  );

  const {
    nodes: fullNodes,
    edges: fullEdges,
    focalServiceId,
  } = useMemo(
    () => (useChainTopology ? createChainServiceMap(12) : createRichContextualServiceMap()),
    [useChainTopology]
  );

  const onExpand = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => new Set(prev).add(nodeId));
  }, []);

  const onCollapse = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  const resetExpansions = useCallback(() => {
    setExpandedNodeIds(new Set());
  }, []);

  const expandedList = [...expandedNodeIds];
  const totalInQuery = fullNodes.length;

  return (
    <div style={{ padding: 16 }}>
      <EuiTitle size="s">
        <h2>Option B: Collapsed groups with expand / collapse</h2>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>
          Capped initial view with <strong>+</strong> / count badges for hidden dependencies,
          progressive expand/collapse, and filters applied to the full query (see controls panel —
          counts include hidden services).
        </p>
      </EuiText>

      <EuiSpacer size="m" />

      <EuiFlexGroup wrap alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend="Dataset"
            options={[
              { id: 'rich', label: 'Rich map (~30 nodes)' },
              { id: 'chain', label: 'Linear chain' },
            ]}
            idSelected={useChainTopology ? 'chain' : 'rich'}
            onChange={(id) => {
              setUseChainTopology(id === 'chain');
              setExpandedNodeIds(new Set());
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFieldNumber
            data-test-subj="expandCollapseMaxVisibleNodes"
            prepend="Max visible (X)"
            value={maxVisibleNodes}
            min={3}
            max={30}
            onChange={(e) => {
              setMaxVisibleNodes(
                e.target.valueAsNumber || CONTEXTUAL_MAP_DEFAULT_MAX_VISIBLE_NODES
              );
              setExpandedNodeIds(new Set());
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFieldNumber
            data-test-subj="expandCollapseBaseMaxHops"
            prepend="Initial hops"
            value={baseMaxHops}
            min={0}
            max={5}
            onChange={(e) => {
              setBaseMaxHops(e.target.valueAsNumber || 0);
              setExpandedNodeIds(new Set());
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">Focal: {focalServiceId}</EuiBadge>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            onClick={resetExpansions}
            data-test-subj="expandCollapseResetExpansions"
          >
            Reset expansions
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiCallOut size="s" title="Acceptance criteria (POC)" iconType="check">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>
            At most <strong>{maxVisibleNodes}</strong> nodes on initial load (of {totalInQuery} in
            query) — expand to reveal more
          </li>
          <li>Hidden dependencies indicated with + and count badge on visible nodes</li>
          <li>
            Filter by alert / SLO / anomaly in controls — option counts reflect the{' '}
            <strong>full query</strong>; badge shows hidden matches when filtered
          </li>
        </ul>
      </EuiCallOut>

      <EuiSpacer size="s" />

      <EuiCallOut size="s" title="Expanded from" iconType="plusInCircle">
        {expandedList.length > 0 ? (
          <p>{expandedList.join(', ')}</p>
        ) : (
          <p>None — click + on a node to reveal its hidden dependencies.</p>
        )}
      </EuiCallOut>

      <EuiSpacer size="m" />

      <CollapsibleServiceMapGraph
        height={getHeight()}
        nodes={fullNodes}
        edges={fullEdges}
        focalServiceId={focalServiceId}
        baseMaxHops={baseMaxHops}
        maxVisibleNodes={maxVisibleNodes}
        expandedNodeIds={expandedNodeIds}
        onExpand={onExpand}
        onCollapse={onCollapse}
        highlightedServiceName={focalServiceId}
        viewFilters={viewFilters}
        onViewFiltersChange={setViewFilters}
      />
    </div>
  );
}

const meta: Meta = {
  title: 'app/ServiceMap/ServiceContextualMapExploration',
  parameters: {
    routePath: '/services/api-gateway/service-map?rangeFrom=now-15m&rangeTo=now',
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Exploration POC for #5453 / #5428. Each story prototypes one approach to service-contextual maps.',
      },
    },
  },
};

export default meta;

export const BASELINE_FOCUS_MAP_STYLE: StoryObj = {
  name: 'Baseline — Focus map today (full data, highlight only)',
  render: () => {
    const { nodes, edges } = createSimpleServiceMap();
    return (
      <div style={{ padding: 16 }}>
        <EuiCallOut
          size="s"
          title="Current behavior: same graph as global map, focal service gets context highlight only"
          color="warning"
        />
        <EuiSpacer size="m" />
        <ServiceMapGraph
          height={getHeight()}
          nodes={nodes}
          edges={edges}
          environment={defaultEnvironment}
          kuery=""
          start={defaultTimeRange.start}
          end={defaultTimeRange.end}
          highlightedServiceName="frontend"
        />
      </div>
    );
  },
};

export const BASELINE_MICROSERVICES_FULL_MAP: StoryObj = {
  name: 'Baseline — Dense map without focal filtering',
  render: () => {
    const { nodes, edges } = createMicroservicesExample();
    return (
      <div style={{ padding: 16 }}>
        <EuiCallOut
          size="s"
          title="Problem: full service map with no focal context — hard to understand dependencies for one service"
          color="warning"
        />
        <EuiSpacer size="m" />
        <ServiceMapGraph
          height={getHeight()}
          nodes={nodes}
          edges={edges}
          environment={defaultEnvironment}
          kuery=""
          start={defaultTimeRange.start}
          end={defaultTimeRange.end}
        />
      </div>
    );
  },
};

export const OPTION_A_HOP_DEPTH_CHAIN: StoryObj = {
  name: 'Option A — Hop depth (linear chain)',
  render: () => <HopDepthExplorationPanel />,
};

export const OPTION_A_HOP_DEPTH_LARGE_MAP: StoryObj = {
  name: 'Option A — Hop depth (40-service map)',
  render: () => <LargeMapHopDepthPanel />,
};

export const OPTION_B_EXPAND_COLLAPSE: StoryObj = {
  name: 'Option B — Expand / collapse hidden dependencies',
  render: () => <ExpandCollapseExplorationPanel />,
};
