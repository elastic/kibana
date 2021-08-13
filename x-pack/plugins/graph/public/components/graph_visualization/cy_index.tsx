/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import cytoscape from 'cytoscape';
import React, { useCallback, useState } from 'react';
import { GraphPanel } from '../graph_panel';
import { Cytoscape } from './cy_component';
import { CollapseExpandAPI, Group, ItemSingular } from './cy_types';
import { GroupAwareWorkspaceNode, GroupAwareWorkspaceEdge } from './graph_visualization';
import { isCollapsedElement, useNodeGrouping } from './cy_grouping';

interface GraphVisualizationProps {
  nodes: GroupAwareWorkspaceNode[];
  edges: GroupAwareWorkspaceEdge[];
  onExpand: (
    startNodes: Array<{ field: string; term: string; weight: number }>,
    targetOptions: { toFields?: unknown }
  ) => void;
  fieldsChoice: Array<{ name: string; color: string }>;
}

export function GraphVisualization({
  nodes,
  edges,
  onExpand,
  fieldsChoice,
}: GraphVisualizationProps) {
  const [cy, setCy] = useState<cytoscape.Core | undefined>(undefined);
  const [selection, onSelection] = useState<ItemSingular[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const cyNodes = remapNodes(nodes);
  const cyEdges = remapEdges(edges, cyNodes);

  useNodeGrouping({ cy, cyNodes, groups });

  const onItemSelection: cytoscape.EventHandler = useCallback(
    (ev) => {
      onSelection(cy?.elements(':selected').toArray() || []);
    },
    [cy]
  );

  const onClick: cytoscape.EventHandler = useCallback((ev) => {
    if (ev.target === ev.cy) {
      return;
    }
    if (ev.target.isNode()) {
      // do something
    } else {
      // it's an edge!
    }
  }, []);

  const onDblClick: cytoscape.EventHandler = useCallback(
    (ev) => {
      if (ev.target === ev.cy) {
        return;
      }
      if (isCollapsedElement(ev.target)) {
        if (!ev.cy) {
          return;
        }
        ev.target.selected(false);
        // @ts-expect-error
        const collapseAPI = ev.cy.expandCollapse('get') as CollapseExpandAPI;
        collapseAPI.expandRecursively(ev.target, {
          layoutBy: null,
          animate: false,
          fisheye: false,
        });
        return;
      }
      if (ev.target.isNode()) {
        const targetNodes: cytoscape.NodeCollection = ev.target.length ? ev.target : [ev.target];
        const nodeData = [
          ...targetNodes.map((el) => {
            return el.data('data');
          }),
        ];

        // expand the node
        onExpand(nodeData, {});
      } else {
        // do nothing
      }
    },
    [onExpand]
  );

  return (
    <>
      <Cytoscape
        elements={cyNodes.concat(cyEdges)}
        height={800}
        onClick={onClick}
        onDblClick={onDblClick}
        onSelection={onItemSelection}
        onReady={() => {}}
        setCy={setCy}
      />
      <GraphPanel
        selection={selection}
        groups={groups}
        fields={fieldsChoice?.map(({ name, color }) => ({ label: name, color })) || []}
        setGroups={setGroups}
        onExpand={(selected) => {
          const nodeData = [
            ...selected.map((el) => {
              return el.data('data');
            }),
          ];
          onExpand(nodeData, {});
        }}
        // @TODO: check why the ready event does not occur correctly
        isLoading={!cy}
        cy={cy}
      />
    </>
  );
}

function remapNodes(nodes: GroupAwareWorkspaceNode[]): cytoscape.ElementDefinition[] {
  if (!nodes) {
    return [];
  }

  const rawNodes = nodes.map(({ x, y, numChildren, id, label, color, icon, data, scaledSize }) => {
    return {
      data: {
        id,
        parent: undefined,
        label,
        color,
        icon,
        children: numChildren,
        data,
        field: data.field,
        size: scaledSize,
      },
      position: { x, y },
    };
  });
  return rawNodes;
}

function remapEdges(
  edges: GroupAwareWorkspaceEdge[],
  nodes: cytoscape.ElementDefinition[]
): cytoscape.ElementDefinition[] {
  if (!edges || !nodes.length) {
    return [];
  }
  const nodeMap = nodes.reduce((memo, node) => {
    const id = node.data.id!;
    memo[id] = node.data;
    return memo;
  }, {} as Record<string, cytoscape.ElementDataDefinition>);
  return edges
    .filter(({ source, target }) => nodeMap[source.id] && nodeMap[target.id])
    .map(({ source, target, weight, width, id, label }) => {
      return {
        data: {
          id,
          source: source.id,
          target: target.id,
          weight,
          width,
          label,
        },
      };
    });
}
