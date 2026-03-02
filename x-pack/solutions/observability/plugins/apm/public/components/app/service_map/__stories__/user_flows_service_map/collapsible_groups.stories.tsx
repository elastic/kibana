/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { Meta, StoryObj, StoryFn } from '@storybook/react';
import {
  EuiButton,
  EuiCallOut,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { MockApmPluginStorybook } from '../../../../../context/apm_plugin/mock_apm_plugin_storybook';
import { ServiceMapGraph } from '../../graph';
import { generateServiceMapElements, type GenerateOptions } from '../generate_elements';
import { applyExpandedGroups } from './expand_collapse_helpers';
import type { ServiceMapNode } from '../../../../../../common/service_map';
import { isGroupedNodeData } from '../../../../../../common/service_map';

function getHeight() {
  return window.innerHeight - 180;
}

const defaultEnvironment = 'ENVIRONMENT_ALL' as const;
const defaultTimeRange = {
  start: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  end: new Date().toISOString(),
};

const meta: Meta = {
  title: 'app/ServiceMap/User Flows – Service Map/Collapsible groups',
  decorators: [
    (Story) => (
      <MockApmPluginStorybook routePath="/service-map?rangeFrom=now-15m&rangeTo=now">
        <Story />
      </MockApmPluginStorybook>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story:
          'Demo: expand and collapse grouped resource nodes. Use the toolbar to change map size and grouped resource count, and toggles to expand or collapse each group. Data is mocked; interactions are live.',
      },
    },
  },
};

export default meta;

function getGroupIds(nodes: ServiceMapNode[]): string[] {
  return nodes.filter((n) => isGroupedNodeData(n.data)).map((n) => n.data.id);
}

export const CollapsibleGroups: StoryFn = () => {
  const [options, setOptions] = useState<GenerateOptions>({
    serviceCount: 8,
    dependencyCount: 2,
    includeGroupedResources: true,
    groupedResourceCount: 2,
    hasAnomalies: true,
    includeBidirectional: false,
  });
  const [baseElements, setBaseElements] = useState(() => generateServiceMapElements(options));
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  const handleGenerate = useCallback(() => {
    setBaseElements(generateServiceMapElements(options));
    setExpandedGroupIds(new Set());
  }, [options]);

  const groupIds = useMemo(() => getGroupIds(baseElements.nodes), [baseElements.nodes]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const { nodes, edges } = useMemo(
    () => applyExpandedGroups(baseElements.nodes, baseElements.edges, expandedGroupIds),
    [baseElements.nodes, baseElements.edges, expandedGroupIds]
  );

  return (
    <div style={{ padding: 16 }}>
      <EuiCallOut size="s" title="User flow: Expand and collapse groups" iconType="folderOpen">
        <p>
          Toggle groups below to expand (show individual dependencies) or collapse (show grouped
          node). Change map options and click Generate to reset. This demo uses mocked data.
        </p>
      </EuiCallOut>
      <EuiSpacer size="m" />

      <EuiFlexGroup wrap gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiToolTip content="Number of service nodes">
            <EuiFieldNumber
              data-test-subj="serviceCountInput"
              prepend="Services"
              value={options.serviceCount}
              min={1}
              max={50}
              onChange={(e) =>
                setOptions((prev) => ({
                  ...prev,
                  serviceCount: e.target.valueAsNumber ?? 1,
                }))
              }
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content="Number of dependency nodes">
            <EuiFieldNumber
              data-test-subj="dependencyCountInput"
              prepend="Dependencies"
              value={options.dependencyCount}
              min={0}
              max={20}
              onChange={(e) =>
                setOptions((prev) => ({
                  ...prev,
                  dependencyCount: e.target.valueAsNumber ?? 0,
                }))
              }
            />
          </EuiToolTip>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiSwitch
            label="Grouped resources"
            checked={options.includeGroupedResources}
            onChange={(e) =>
              setOptions((prev) => ({
                ...prev,
                includeGroupedResources: e.target.checked,
              }))
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFieldNumber
            data-test-subj="apmCollapsibleGroupsFieldNumber"
            prepend="Groups"
            value={options.groupedResourceCount}
            min={1}
            max={5}
            disabled={!options.includeGroupedResources}
            onChange={(e) =>
              setOptions((prev) => ({
                ...prev,
                groupedResourceCount: e.target.valueAsNumber ?? 1,
              }))
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton data-test-subj="generateMapButton" onClick={handleGenerate} iconType="refresh">
            Generate map
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>

      {groupIds.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" wrap gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiFormLabel>Expand group:</EuiFormLabel>
            </EuiFlexItem>
            {groupIds.map((groupId) => (
              <EuiFlexItem key={groupId} grow={false}>
                <EuiSwitch
                  label={groupId}
                  checked={expandedGroupIds.has(groupId)}
                  onChange={() => toggleGroup(groupId)}
                  data-test-subj={`expandGroup-${groupId}`}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      )}

      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        <p>
          Nodes: {nodes.length} | Edges: {edges.length}
          {groupIds.length > 0 &&
            ` | Expanded: ${groupIds.filter((id) => expandedGroupIds.has(id)).length}/${
              groupIds.length
            } groups`}
        </p>
      </EuiText>
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
};

export const CollapsibleGroupsDefault: StoryObj = {
  render: () => <CollapsibleGroups />,
};
