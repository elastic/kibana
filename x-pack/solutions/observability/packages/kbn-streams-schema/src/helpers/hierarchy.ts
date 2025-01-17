/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function isDescendantOf(parent: string, child: string) {
  const parentSegments = parent.split('.');
  const childSegments = child.split('.');
  return (
    parentSegments.length < childSegments.length &&
    parentSegments.every((segment, index) => segment === childSegments[index])
  );
}

export function isDSNS(stream: string) {
  return stream.match(/^[^-]+-[^-]+-[^-]+$/);
}

export function isChildOf(parent: string, child: string) {
  if (isDSNS(parent)) {
    // if the parent is not managed, the child is a direct child if the dataset of the parent
    // id is a prefix of the child id (and there is just one more part in the child id)
    // DSNS is logs-<dataset>-<namespace>
    const parentDataset = parent.split('-')[1];
    const childDataset = child.split('-')[1];
    return (
      childDataset.startsWith(parentDataset) &&
      parentDataset.split('.').length + 1 === childDataset.split('.').length
    );
  }
  return isDescendantOf(parent, child) && child.split('.').length === parent.split('.').length + 1;
}

export function getParentId(id: string) {
  if (isDSNS(id)) {
    // if the id is not managed,
    // the parent id is the same as id, but one dot suffix
    // removed from the dataset part
    // DSNS is logs-<dataset>-<namespace>
    const parts = id.split('-');
    if (parts.length !== 3) {
      return undefined;
    }
    const datasetParts = parts[1].split('.');
    if (datasetParts.length === 1) {
      return undefined;
    }
    return `${parts[0]}-${datasetParts.slice(0, datasetParts.length - 1).join('.')}-${parts[2]}`;
  }
  const parts = id.split('.');
  if (parts.length === 1) {
    return undefined;
  }
  return parts.slice(0, parts.length - 1).join('.');
}

export function isWiredRoot(id: string) {
  return id.split('.').length === 1;
}

export function getAncestors(id: string, unwiredRootId?: string) {
  if (unwiredRootId && isDSNS(id)) {
    const [prefix, dataset, suffix] = id.split('-');
    const unwiredRootDataset = unwiredRootId.split('-')[1];
    const datasetParts = dataset.split('.');
    const unwiredRootParts = unwiredRootDataset.split('.');
    const ancestors = [];

    for (let i = datasetParts.length - 1; i >= unwiredRootParts.length - 1; i--) {
      const ancestorDataset = datasetParts.slice(0, i + 1).join('.');
      ancestors.push(`${prefix}-${ancestorDataset}-${suffix}`);
    }

    return ancestors;
  }

  const parts = id.split('.');
  return parts.slice(0, parts.length - 1).map((_, index) => parts.slice(0, index + 1).join('.'));
}
