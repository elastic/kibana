/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KubernetesCollection, DynamicTree } from '../../../types';
import { KUBERNETES_COLLECTION_FIELDS } from '../helpers';
import { translations } from './translations';

const LOGICAL_TREE_VIEW: DynamicTree[] = [
  {
    key: KUBERNETES_COLLECTION_FIELDS.cluster,
    iconProps: { type: 'heatmap', color: 'success' },
    type: KubernetesCollection.cluster,
    name: translations.cluster(),
    namePlural: translations.cluster(true),
  },
  {
    key: KUBERNETES_COLLECTION_FIELDS.namespace,
    iconProps: { type: 'nested', color: 'primary' },
    type: KubernetesCollection.namespace,
    name: translations.namespace(),
    namePlural: translations.namespace(true),
  },
  {
    key: KUBERNETES_COLLECTION_FIELDS.pod,
    iconProps: { type: 'package', color: 'warning' },
    type: KubernetesCollection.pod,
    name: translations.pod(),
    namePlural: translations.pod(true),
  },
  {
    key: KUBERNETES_COLLECTION_FIELDS.containerImage,
    iconProps: { type: 'image', color: 'danger' },
    type: KubernetesCollection.containerImage,
    name: translations.containerImage(),
    namePlural: translations.containerImage(true),
  },
];

const INFRASTRUCTURE_TREE_VIEW = LOGICAL_TREE_VIEW.map((tree, index) => {
  if (index === 1) {
    return {
      key: KUBERNETES_COLLECTION_FIELDS.node,
      iconProps: { type: 'node', color: 'primary' },
      type: KubernetesCollection.node,
      name: translations.node(),
      namePlural: translations.node(true),
    };
  }
  return tree;
});

export const TREE_VIEW = {
  logical: LOGICAL_TREE_VIEW,
  infrastructure: INFRASTRUCTURE_TREE_VIEW,
};

export const INFRASTRUCTURE = 'infrastructure';
export const LOGICAL = 'logical';
