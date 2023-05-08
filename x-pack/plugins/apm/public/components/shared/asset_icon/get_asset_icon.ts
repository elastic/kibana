/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import defaultIcon from '../span_icon/icons/default.svg';
import nodeIcon from './icons/kubernetes.node.svg';
import nsIcon from './icons/kubernetes.namespace.svg';
import clusterIcon from './icons/orchestrator.cluster.name.svg';
import podIcon from './icons/kubernetes.pod.svg';

const assetIcons: { [key: string]: string } = {
  default: defaultIcon,
  'orchestrator.cluster.name': clusterIcon,
  'kubernetes.namespace': nsIcon,
  'kubernetes.node.name': nodeIcon,
  'kubernetes.pod.name': podIcon,
};

export function getAssetIcon(assetType: string | undefined) {
  return assetIcons[assetType ?? 'default'];
}
