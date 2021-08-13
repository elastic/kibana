/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import cytoscape from 'cytoscape';
import { useEffect, useMemo } from 'react';
import chroma from 'chroma-js';
import { CollapseExpandAPI, Group, ItemSingular } from './cy_types';

export function isCollapsedElement(element: ItemSingular) {
  return element.hasClass('cy-expand-collapse-collapsed-node');
}

export function getGroupContent(cy: cytoscape.Core | undefined, item: ItemSingular) {
  // @ts-expect-error
  const result = (cy?.expandCollapse('get') as CollapseExpandAPI)?.getCollapsedChildrenRecursively(
    item
  );
  return result?.length === 0 ? undefined : result;
}

export function useNodeGrouping({
  cy,
  groups,
  cyNodes,
}: {
  cy: cytoscape.Core | undefined;
  groups: Group[];
  cyNodes: cytoscape.NodeDefinition[];
}) {
  // @ts-expect-error
  const collapseExpandAPI = useMemo(() => cy?.expandCollapse('get') as CollapseExpandAPI, [cy]);
  useEffect(() => {
    if (cy) {
      // workout the group differences between the chart and state
      const { groupsToRemove, groupsToUpdate, groupsToAdd } = partitionGroups(
        cy,
        collapseExpandAPI,
        groups
      );
      if (groupsToRemove.length) {
        removeGroupsFromGraph(cy, collapseExpandAPI, groupsToRemove);
      }
      if (groupsToAdd.length) {
        addGroupsToGraph(cy, collapseExpandAPI, groupsToAdd);
      }
      if (groupsToUpdate.length) {
        // workout the group id
        const groupIdToColor = groups.reduce((memo, { id, color }) => {
          memo[id] = color;
          return memo;
        }, {} as Record<string, string>);
        for (const groupNode of groupsToUpdate) {
          const groupId = groupNode.data('groupId');
          groupNode.data('color', groupIdToColor[groupId]);
        }
      }
      if (groupsToRemove.length || groupsToAdd.length) {
        cy.trigger('custom:data', [false]);
      }
    }
  }, [cy, groups, cyNodes, collapseExpandAPI]);
}

function generateGroupId(prefix: string, term: string) {
  return `${prefix}~~${term}`;
}

function partitionGroups(
  cy: cytoscape.Core,
  collapseExpandAPI: CollapseExpandAPI,
  groups: Group[]
) {
  const groupNodes = collapseExpandAPI.expandableNodes();
  const groupIds = new Set(groups.map(({ id }) => id));
  const toRemove: cytoscape.NodeSingular[] = [];
  const toUpdate: cytoscape.NodeSingular[] = [];
  const groupsVisited = new Set();
  const groupedFields: Record<string, Set<string>> = {};
  groupNodes.forEach((groupNode) => {
    const groupId = groupNode.data('groupId');
    groupsVisited.add(groupId);
    groupedFields[groupId] = groupedFields[groupId] || new Set();
    groupedFields[groupId].add(groupNode.data('field'));

    if (!groupIds.has(groupId)) {
      toRemove.push(groupNode);
    } else {
      // check if the update is required
      toUpdate.push(groupNode);
    }
  });
  const toAdd = groups.filter(({ id }) => !groupsVisited.has(id));
  const toAddLookup = new Set(toAdd.map(({ id }) => id));
  // there are 2 more scenarios to take into consideration:
  // * a field is added to an existing group (case 1)
  // * a field is removed from an existing group (case 2)

  // Case 1
  const filteredGroups = groups.filter(({ id }) => groupsVisited.has(id));
  // check if any of the field types in the graph are not grouped yet
  const fields = filteredGroups.flatMap(({ selected, id }) =>
    selected.map(({ label }) => ({
      field: label,
      id,
    }))
  );
  // if a field in a group is found outside the collapsed node skip the check for that group
  // it's already in queue to be remade
  const alreadyProcessed = new Set();
  for (const { field, id: groupId } of fields) {
    if (!alreadyProcessed.has(groupId)) {
      const affectedNodes = cy
        .nodes(`node[field= "${field}"]`)
        .filter((el) => !isCollapsedElement(el));
      // add the group node to both remove and add list
      if (affectedNodes.length) {
        alreadyProcessed.add(groupId);
        if (!toAddLookup.has(groupId)) {
          toAdd.push(groups.find(({ id }) => id === groupId)!);
        }
        toRemove.push(
          ...(groupNodes
            .filter((groupNode) => groupNode.data('groupId') === groupId)
            .toArray() as cytoscape.NodeSingular[])
        );
      }
    }
  }
  // Case 2
  const groupsWithLessFields = filteredGroups.filter(
    ({ id, selected }) => selected.length < groupedFields[id].size && !toAddLookup.has(id)
  );
  if (groupsWithLessFields.length) {
    const idLookup = new Set(groupsWithLessFields.map(({ id }) => id));
    toAdd.push(...groupsWithLessFields);
    toRemove.push(
      ...(groupNodes
        .filter((groupNode) => idLookup.has(groupNode.data('groupId')))
        .toArray() as cytoscape.NodeSingular[])
    );
  }
  return { groupsToRemove: toRemove, groupsToUpdate: toUpdate, groupsToAdd: toAdd };
}

function addGroupsToGraph(
  cy: cytoscape.Core,
  collapseExpandAPI: CollapseExpandAPI,
  groups: Group[]
) {
  // workout the group id
  const groupdIdByField = groups.reduce((memo, { id, color, selected }) => {
    for (const { label } of selected) {
      memo[label] = { id, color };
    }
    return memo;
  }, {} as Record<string, { id: string; color: string }>);
  const groupedFields = Object.keys(groupdIdByField);
  // workout the subgroups based on terms
  const affectedNodes = cy.nodes(
    groupedFields.map((field) => `node[field = "${field}"]`).join(', ')
  );
  const nodeToParentId: Record<string, string> = {};
  const nodeGroups: Record<string, cytoscape.NodeDefinition> = {};
  // group elems based on which group they belongs
  affectedNodes.forEach((node) => {
    const data = node.data('data');
    const group = groupdIdByField[data.field];
    const parentId = generateGroupId(group.id, data.term);
    const id: string = node.data('id');
    nodeToParentId[id] = parentId;
    if (!nodeGroups[parentId]) {
      nodeGroups[parentId] = {
        data: {
          id: parentId,
          parent: undefined,
          color: chroma(group.color).alpha(0.5).css(),
          label: data.term,
          groupId: group.id,
          field: data.field,
        },
        selectable: true,
      };
    }
  });
  const groupedNodes = cy.add(Object.values(nodeGroups));
  affectedNodes.forEach((node) => {
    node.move({ parent: nodeToParentId[node.data('id')] });
  });
  collapseExpandAPI.collapse(groupedNodes, { layoutBy: null, fisheye: false, animate: false });
}

function removeGroupsFromGraph(
  cy: cytoscape.Core,
  collapseExpandAPI: CollapseExpandAPI,
  groups: cytoscape.NodeSingular[]
) {
  // expand all groups and move out the children
  groups.forEach((groupNode) => {
    collapseExpandAPI.expand(groupNode, { layoutBy: null, fisheye: false, animate: false });
    const children = groupNode.children();
    // @ts-expect-error
    children.move({ parent: null });
    cy.remove(groupNode);
  });
}
