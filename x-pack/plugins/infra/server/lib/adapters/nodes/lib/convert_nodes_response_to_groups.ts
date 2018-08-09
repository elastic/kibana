/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { InfraNode } from '../../../../../common/graphql/types';
import { InfraBucket, InfraNodeRequestOptions } from '../adapter_types';
import { extractGroupPaths } from './extract_group_paths';

export function convertNodesResponseToGroups(
  options: InfraNodeRequestOptions,
  nodes: InfraBucket[]
): InfraNode[] {
  let results: InfraNode[] = [];
  nodes.forEach((node: InfraBucket) => {
    const nodesWithPaths = extractGroupPaths(options, node);
    results = results.concat(nodesWithPaths);
  });
  return results;
}
