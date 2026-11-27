/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode } from '../../../../common/service_map';
import { getAbsoluteNodePosition } from './get_absolute_node_position';

const node = (id: string, x: number, y: number, parentId?: string): ServiceMapNode =>
  ({
    id,
    type: 'service',
    position: { x, y },
    data: { id, label: id },
    parentId,
  } as ServiceMapNode);

describe('getAbsoluteNodePosition', () => {
  const box = node('box', 100, 200);
  const member = node('member', 24, 72, 'box');
  const nodesById = new Map([box, member].map((n) => [n.id, n] as const));

  it('returns the position of a node that has no parent', () => {
    expect(getAbsoluteNodePosition(box, nodesById)).toEqual({ x: 100, y: 200 });
  });

  it('adds the position of the box to the position of a member', () => {
    expect(getAbsoluteNodePosition(member, nodesById)).toEqual({ x: 124, y: 272 });
  });

  it('uses the position of the node when its parent is not on the map', () => {
    expect(getAbsoluteNodePosition(member, new Map())).toEqual({ x: 24, y: 72 });
  });
});
