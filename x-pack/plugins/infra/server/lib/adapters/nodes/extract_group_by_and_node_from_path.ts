/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { InfraPathInput, InfraPathType } from '../../../../common/graphql/types';
import { InfraNodeType } from './adapter_types';

const getNodeType = (type: InfraPathType): InfraNodeType => {
  switch (type) {
    case InfraPathType.pods:
      return InfraNodeType.pod;
    case InfraPathType.containers:
      return InfraNodeType.container;
    case InfraPathType.hosts:
      return InfraNodeType.host;
    default:
      throw new Error('Invalid InfraPathType');
  }
};

export function extractGroupByAndNodeFromPath(path: InfraPathInput[]) {
  const nodePart = path[path.length - 1];
  const nodeType = getNodeType(nodePart.type);
  const groupBy = path.slice(0, path.length - 1);
  return { groupBy, nodeType };
}
