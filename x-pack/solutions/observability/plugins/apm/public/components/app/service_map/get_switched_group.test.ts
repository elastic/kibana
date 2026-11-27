/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ServiceMapNode } from '../../../../common/service_map';
import { getSwitchedGroup } from './get_switched_group';

const groupNode = (id: string, type: 'serviceGroup' | 'serviceGroupBox', label = id) =>
  ({ id, type, position: { x: 0, y: 0 }, data: { id, label } } as ServiceMapNode);

const serviceNode = (id: string): ServiceMapNode => ({
  id,
  type: 'service',
  position: { x: 0, y: 0 },
  data: { id, label: id, isService: true },
});

describe('getSwitchedGroup', () => {
  it('has no switched group on the first call, and returns the type of each group', () => {
    const { currentTypes, switchedGroup } = getSwitchedGroup(new Map(), [
      groupNode('shop', 'serviceGroup'),
      groupNode('finance', 'serviceGroupBox'),
      serviceNode('a'),
    ]);

    expect(switchedGroup).toBeUndefined();
    expect(Array.from(currentTypes)).toEqual([
      ['shop', 'serviceGroup'],
      ['finance', 'serviceGroupBox'],
    ]);
  });

  it('finds a group that was opened', () => {
    const { switchedGroup } = getSwitchedGroup(new Map([['shop', 'serviceGroup']]), [
      groupNode('shop', 'serviceGroupBox', 'Shop'),
    ]);

    expect(switchedGroup).toEqual({ id: 'shop', label: 'Shop', isOpened: true });
  });

  it('finds a group that was closed', () => {
    const { switchedGroup } = getSwitchedGroup(new Map([['shop', 'serviceGroupBox']]), [
      groupNode('shop', 'serviceGroup', 'Shop'),
    ]);

    expect(switchedGroup).toEqual({ id: 'shop', label: 'Shop', isOpened: false });
  });

  it('falls back to the id when the group has no label', () => {
    const { switchedGroup } = getSwitchedGroup(new Map([['shop', 'serviceGroup']]), [
      groupNode('shop', 'serviceGroupBox', ''),
    ]);

    expect(switchedGroup?.label).toBe('shop');
  });

  it('is not a switch when the group stays as it was, or appears or disappears', () => {
    const previous = new Map([
      ['shop', 'serviceGroup'],
      ['gone', 'serviceGroup'],
    ]);

    const { switchedGroup } = getSwitchedGroup(previous, [
      groupNode('shop', 'serviceGroup'),
      groupNode('new', 'serviceGroupBox'),
    ]);

    expect(switchedGroup).toBeUndefined();
  });
});
