/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KubernetesCollectionMap, KubernetesTreeViewLevels } from '../../../types';

export const showBreadcrumbDisplayText = (
  treeNavSelection: Partial<KubernetesCollectionMap<string>>,
  collectionType: string
): boolean => {
  const resourceNames = Object.keys(treeNavSelection);
  const lastSelectedResourceName = resourceNames[resourceNames.length - 1];

  const isClusterNameSelected =
    lastSelectedResourceName === KubernetesTreeViewLevels.clusterName &&
    collectionType === KubernetesTreeViewLevels.clusterId;

  const isLastSelectedCollectionType = collectionType === lastSelectedResourceName;
  return isClusterNameSelected || isLastSelectedCollectionType;
};
