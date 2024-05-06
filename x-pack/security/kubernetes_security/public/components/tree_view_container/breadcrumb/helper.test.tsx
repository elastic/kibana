/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KubernetesCollectionMap, KubernetesTreeViewLevels } from '../../../types';
import { showBreadcrumbDisplayText } from './helper';

describe('showBreadcrumbDisplayText()', () => {
  it('should return true when last breadcrumb is clusterId or clusterName', () => {
    const MOCK_TREE_SELECTION: Partial<KubernetesCollectionMap> = {
      clusterId: 'selected cluster id',
      clusterName: 'selected cluster name',
    };

    expect(showBreadcrumbDisplayText(MOCK_TREE_SELECTION, KubernetesTreeViewLevels.clusterId)).toBe(
      true
    );
  });

  it('should return false when collectionType is not the last breadcrumb ', () => {
    const MOCK_TREE_SELECTION: Partial<KubernetesCollectionMap> = {
      clusterId: 'selected cluster id',
      clusterName: 'selected cluster name',
      node: 'selected node name',
    };

    expect(showBreadcrumbDisplayText(MOCK_TREE_SELECTION, KubernetesTreeViewLevels.clusterId)).toBe(
      false
    );
  });

  it('should true  when node is the last breadcrumb ', () => {
    const MOCK_TREE_SELECTION: Partial<KubernetesCollectionMap> = {
      clusterId: 'selected cluster id',
      clusterName: 'selected cluster name',
      node: 'selected node name',
    };

    expect(showBreadcrumbDisplayText(MOCK_TREE_SELECTION, KubernetesTreeViewLevels.node)).toBe(
      true
    );
  });

  it('should true  when pod is the last breadcrumb ', () => {
    const MOCK_TREE_SELECTION: Partial<KubernetesCollectionMap> = {
      clusterId: 'selected cluster id',
      clusterName: 'selected cluster name',
      node: 'selected node name',
      pod: 'selected pod name',
    };

    expect(showBreadcrumbDisplayText(MOCK_TREE_SELECTION, KubernetesTreeViewLevels.pod)).toBe(true);
  });
  it('should true  when container image  is the last breadcrumb ', () => {
    const MOCK_TREE_SELECTION: Partial<KubernetesCollectionMap> = {
      clusterId: 'selected cluster id',
      clusterName: 'selected cluster name',
      node: 'selected node name',
      pod: 'selected pod name',
      containerImage: 'selected container image',
    };

    expect(
      showBreadcrumbDisplayText(MOCK_TREE_SELECTION, KubernetesTreeViewLevels.containerImage)
    ).toBe(true);
  });
});
