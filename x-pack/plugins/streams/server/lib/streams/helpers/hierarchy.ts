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

// streams are named by dots: logs.a.b.c - a child means there is only one level of dots added
export function isChildOf(parent: StreamDefinition, child: StreamDefinition) {
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
