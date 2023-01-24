/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ResolverNode } from '../../../common/endpoint/types';

/**
 * Simple mock endpoint event that works for tree layouts.
 */
export function mockResolverNode({
  id,
  name = 'node',
  timestamp,
  parentID,
  stats = { total: 0, byCategory: {} },
}: {
  id: string;
  name: string;
  timestamp: number;
  parentID?: string;
  stats?: ResolverNode['stats'];
}): ResolverNode {
  const resolverNode: ResolverNode = {
    id,
    name,
    stats,
    parent: parentID,
    data: {
      '@timestamp': timestamp,
      'process.entity_id': id,
      'process.name': name,
      'process.parent.entity_id': parentID,
    },
  };

  return resolverNode;
}
