/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamDefinition } from '../../../../common/types';

export function isDescendandOf(parent: StreamDefinition, child: StreamDefinition) {
  return child.id.startsWith(parent.id);
}

export function isDSNS(stream: StreamDefinition) {
  return stream.id.match(/^[^-]+-[^-]+-[^-]+$/);
}

export function isChildOf(parent: StreamDefinition, child: StreamDefinition) {
  if (isDSNS(parent)) {
    // if the parent is not managed, the child is a direct child if the dataset of the parent
    // id is a prefix of the child id (and there is just one more part in the child id)
    // DSNS is logs-<dataset>-<namespace>
    const parentDataset = parent.id.split('-')[1];
    const childDataset = child.id.split('-')[1];
    return (
      childDataset.startsWith(parentDataset) &&
      parentDataset.split('.').length + 1 === childDataset.split('.').length
    );
  }
  return (
    isDescendandOf(parent, child) && child.id.split('.').length === parent.id.split('.').length + 1
  );
}

export function getParentId(id: string) {
  const parts = id.split('.');
  if (parts.length === 1) {
    return undefined;
  }
  return parts.slice(0, parts.length - 1).join('.');
}

export function isRoot(id: string) {
  return id.split('.').length === 1;
}

export function getAncestors(id: string) {
  const parts = id.split('.');
  return parts.slice(0, parts.length - 1).map((_, index) => parts.slice(0, index + 1).join('.'));
}
