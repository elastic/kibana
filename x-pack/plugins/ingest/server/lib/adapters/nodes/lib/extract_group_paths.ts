/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraNode, InfraPathInput } from '../../../../../common/graphql/types';
import { InfraBucket, InfraNodeRequestOptions } from '../adapter_types';
import { createNodeItem } from './create_node_item';

export interface InfraPathItem {
  path: string[];
  nodeItem: InfraNode;
}

export function extractGroupPaths(
  options: InfraNodeRequestOptions,
  node: InfraBucket
): InfraNode[] {
  const { groupBy } = options;
  const secondGroup: InfraPathInput = groupBy[1];
  const paths: InfraNode[] = node.path_0.buckets.reduce(
    (acc: InfraNode[], bucket: InfraBucket, index: number): InfraNode[] => {
      const key: string = (bucket.key || index).toString();
      if (secondGroup) {
        return acc.concat(
          bucket.path_1.buckets.map(
            (b: InfraBucket): InfraNode => {
              const innerNode = createNodeItem(options, node, b);
              const nodePath = [
                { value: bucket.key.toString() },
                { value: b.key.toString() },
              ].concat(innerNode.path);
              return {
                ...innerNode,
                path: nodePath,
              };
            }
          )
        );
      }
      const nodeItem = createNodeItem(options, node, bucket);
      const path = [{ value: key }].concat(nodeItem.path);
      return acc.concat({
        ...nodeItem,
        path,
      });
    },
    []
  );
  return paths;
}
