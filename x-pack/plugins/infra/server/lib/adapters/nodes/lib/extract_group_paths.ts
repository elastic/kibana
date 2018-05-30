/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createNodeItem } from './create_node_item';

import { InfraGroupBy } from '../../../../../common/types';
import {
  InfraBucket,
  InfraNode,
  InfraNodeRequestOptions,
} from '../../../infra_types';
export interface InfraPathItem {
  path: string[];
  nodeItem: InfraNode;
}

export function extractGroupPaths(
  options: InfraNodeRequestOptions,
  node: InfraBucket
): InfraPathItem[] {
  const { groupBy } = options;
  const firstGroup: InfraGroupBy = groupBy[0];
  const secondGroup: InfraGroupBy = groupBy[1];
  const paths: InfraPathItem[] = node[firstGroup!.id].buckets.reduce(
    (
      acc: InfraPathItem[],
      bucket: InfraBucket,
      index: number
    ): InfraPathItem[] => {
      if (secondGroup) {
        return acc.concat(
          bucket[secondGroup!.id].buckets.map(
            (b: InfraBucket): InfraPathItem => {
              return {
                nodeItem: createNodeItem(options, node, bucket),
                path: [bucket.key, b.key],
              };
            }
          )
        );
      }
      const key: string = String(bucket.key || index);
      return acc.concat({
        nodeItem: createNodeItem(options, node, bucket),
        path: [key],
      });
    },
    []
  );
  return paths;
}
