/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';

import { InfraGroup, InfraGroupBy } from '../../../../../common/graphql/types';
import { InfraBucket, InfraNodeRequestOptions } from '../adapter_types';
import { extractGroupPaths, InfraPathItem } from './extract_group_paths';
import { findOrCreateGroupWithNodes, findOrCreateGroupWithSubGroups } from './find_or_create_group';

export function convertNodesResponseToGroups(
  options: InfraNodeRequestOptions,
  nodes: InfraBucket[]
): InfraGroup[] {
  /**
   * If there is only one groupBy then this should return InfraGroupWithNodes group
   * otherwise it should return an InfraGroupWithSubGroups
   */

  const { groupBy } = options;

  const firstGroupDef: InfraGroupBy = groupBy[0];
  const secondGroupDef: InfraGroupBy = groupBy[1];
  const isSingleLevelGroupBy = groupBy.length === 1;
  const groups: InfraGroup[] = [];

  if (isSingleLevelGroupBy) {
    nodes.forEach((node: InfraBucket) => {
      const paths: InfraPathItem[] = extractGroupPaths(options, node);
      paths.forEach((pathItem: InfraPathItem) => {
        const { path, nodeItem } = pathItem;
        const [firstPart] = path;

        const group: InfraGroup = findOrCreateGroupWithNodes(groups, firstPart, firstGroupDef);
        const newNodes = (group[options.nodesKey] || []).concat([nodeItem]);
        if (!groups.includes(group)) {
          groups.push(group);
        }
        set(group, options.nodesKey, newNodes);
      });
    });
  } else {
    nodes.forEach((node: InfraBucket) => {
      // Extract the paths and nodes from the node bucket
      const paths: InfraPathItem[] = extractGroupPaths(options, node);

      // Loop through each path and find or create the group for each level.
      // For the subgroups we need to add the node
      paths.forEach((pathItem: InfraPathItem) => {
        const { path, nodeItem } = pathItem;
        const [firstPart, secondPart] = path;

        const group: InfraGroup = findOrCreateGroupWithSubGroups(groups, firstPart, firstGroupDef);
        if (!groups.includes(group)) {
          groups.push(group);
        }
        if (secondGroupDef && group.groups != null) {
          const secondGroup: InfraGroup = findOrCreateGroupWithNodes(
            group.groups,
            secondPart,
            secondGroupDef
          );
          const newNodes = (secondGroup[options.nodesKey] || []).concat([nodeItem]);
          set(secondGroup, options.nodesKey, newNodes);
          if (!group.groups.includes(secondGroup)) {
            group.groups.push(secondGroup);
          }
        }
      });
    });
  }
  return groups;
}
