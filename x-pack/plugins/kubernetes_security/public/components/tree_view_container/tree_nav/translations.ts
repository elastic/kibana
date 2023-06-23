/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const TREE_NAV_CLUSTER = (isPlural = false) =>
  i18n.translate('xpack.kubernetesSecurity.treeNav.cluster', {
    defaultMessage: '{isPlural, plural, =1 {clusters} other {cluster}}',
    values: { isPlural: isPlural ? 1 : 0 },
  });
const TREE_NAV_NAMESPACE = (isPlural = false) =>
  i18n.translate('xpack.kubernetesSecurity.treeNav.namespace', {
    defaultMessage: '{isPlural, plural, =1 {namespaces} other {namespace}}',
    values: { isPlural: isPlural ? 1 : 0 },
  });
const TREE_NAV_POD = (isPlural = false) =>
  i18n.translate('xpack.kubernetesSecurity.treeNav.pod', {
    defaultMessage: '{isPlural, plural, =1 {pods} other {pod}}',
    values: { isPlural: isPlural ? 1 : 0 },
  });
const TREE_NAV_CONTAINER_IMAGE = (isPlural = false) =>
  i18n.translate('xpack.kubernetesSecurity.treeNav.containerImage', {
    defaultMessage: '{isPlural, plural, =1 {container images} other { container image}}',
    values: { isPlural: isPlural ? 1 : 0 },
  });
const TREE_NAV_NODE = (isPlural = false) =>
  i18n.translate('xpack.kubernetesSecurity.treeNav.node', {
    defaultMessage: '{isPlural, plural, =1 {nodes} other {node}}',
    values: { isPlural: isPlural ? 1 : 0 },
  });

export const translations = {
  cluster: TREE_NAV_CLUSTER,
  namespace: TREE_NAV_NAMESPACE,
  pod: TREE_NAV_POD,
  containerImage: TREE_NAV_CONTAINER_IMAGE,
  node: TREE_NAV_NODE,
};
