/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
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

const isEntityType = (path: InfraPathInput) => {
  if (!path) {
    return false;
  }
  switch (path.type) {
    case InfraPathType.containers:
    case InfraPathType.hosts:
    case InfraPathType.pods:
      return true;
    default:
      return false;
  }
};

const moreThenOneEntityType = (path: InfraPathInput[]) => {
  return path.filter(isEntityType).length > 1;
};

export function extractGroupByAndNodeFromPath(path: InfraPathInput[]) {
  if (moreThenOneEntityType(path)) {
    throw new Error(
      i18n.translate(
        'xpack.infra.extractGroupByAndNodeFromPath.onlyOneEntityTypeInThePathErrorTitle',
        {
          defaultMessage: 'There can be only one entity type in the path.',
        }
      )
    );
  }
  if (path.length > 3) {
    throw new Error(
      i18n.translate(
        'xpack.infra.extractGroupByAndNodeFromPath.maxThreeElementsInThePathErrorTitle',
        {
          defaultMessage: 'The path can only have a maximum of 3 elements.',
        }
      )
    );
  }
  const nodePart = path[path.length - 1];
  if (!isEntityType(nodePart)) {
    throw new Error(
      i18n.translate(
        'xpack.infra.extractGroupByAndNodeFromPath.lastElementInPathContainErrorTitle',
        {
          defaultMessage:
            'The last element in the path should be either a "hosts", "containers" or "pods" path type.',
        }
      )
    );
  }
  const nodeType = getNodeType(nodePart.type);
  const groupBy = path.slice(0, path.length - 1);
  return { groupBy, nodeType };
}
