/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { resolveLocations } from './utils';
import { ProcessorSelector } from '../../types';
import { DragAndDropSpecialLocations } from '../../constants';

const TREE_A_ROOT = ['TREE_A'];
const TREE_B_ROOT = ['TREE_B'];

describe('Resolve destination location', () => {
  it('resolves to root level when dragged to top', () => {
    const items = [
      /* pos 0 -- this should displace item below, same with rest */
      ['0'],
      /* pos 1 */
      ['0', 'onFailure', '0'],
    ];
    const result = resolveLocations({
      destinationItems: items,
      destinationIndex: 0 /* corresponds to position 0, when dragging up */,
      baseDestinationSelector: TREE_A_ROOT,
      dragDirection: 'up',
      baseSourceSelector: TREE_A_ROOT,
      sourceSelector: ['0'],
    });
    expect(result).toEqual({ source: ['TREE_A', '0'], destination: ['TREE_A', '0'] });
  });

  it('nests an element at the position it was placed', () => {
    const items = [
      ['0'],
      /* pos 0 -- this should displace item below, same with rest */
      ['0', 'onFailure', '0'],
      /* pos 1 */
      ['1'],
      /* pos 2 */
      ['1', 'onFailure', '0'],
      /* pos 3 */
      ['2'],
    ];
    const result2 = resolveLocations({
      destinationItems: items,
      destinationIndex: 2 /* corresponds to pos 2, when dragging down */,
      baseDestinationSelector: TREE_A_ROOT,
      dragDirection: 'down',
      baseSourceSelector: TREE_A_ROOT,
      sourceSelector: ['0'],
      isSourceAtRootLevel: true,
    });

    expect(result2).toEqual({
      source: ['TREE_A', '0'],
      destination: ['TREE_A', '1', 'onFailure', '0'],
    });
  });

  it('handles special case of dragging to bottom with root level item', () => {
    const items = [['0'], ['0', 'onFailure', '0'], ['1'], ['1', 'onFailure', '0']];
    const result2 = resolveLocations({
      destinationItems: items,
      destinationIndex: 3 /* corresponds to pos 3, when dragging down */,
      baseDestinationSelector: TREE_A_ROOT,
      dragDirection: 'down',
      baseSourceSelector: TREE_A_ROOT,
      sourceSelector: ['0'],
      isSourceAtRootLevel: true,
    });
    expect(result2).toEqual({
      source: ['TREE_A', '0'],
      destination: ['TREE_A', DragAndDropSpecialLocations.bottom],
    });
  });

  it('sets the base selector if there are no items', () => {
    const items: ProcessorSelector[] = [];
    const result = resolveLocations({
      destinationItems: items,
      destinationIndex: items.length - 1,
      baseDestinationSelector: TREE_A_ROOT,
      dragDirection: 'none',
      baseSourceSelector: TREE_B_ROOT,
      sourceSelector: ['123'],
    });
    expect(result).toEqual({
      destination: TREE_A_ROOT.concat('0'),
      source: TREE_B_ROOT.concat('123'),
    });
  });

  it('displaces the current item if surrounded by items at same level', () => {
    const items = [['0'], ['0', 'onFailure', '0'], ['0', 'onFailure', '1']];
    const result = resolveLocations({
      destinationItems: items,
      destinationIndex: 1,
      baseDestinationSelector: TREE_A_ROOT,
      dragDirection: 'up',
      baseSourceSelector: TREE_A_ROOT,
      sourceSelector: ['0'],
    });
    expect(result).toEqual({
      source: ['TREE_A', '0'],
      destination: ['TREE_A', '0', 'onFailure', '0'],
    });
  });

  it('displaces bottom item if surrounding items are at different levels', () => {
    const items1 = [
      ['0'],
      /* pos 0 -- this should displace item below, same with rest */
      ['0', 'onFailure', '0'],
      /* pos 1 */
      ['0', 'onFailure', '1'],
      /* pos 2 */
      ['0', 'onFailure', '1', 'onFailure', '0'],
      /* pos 3 */
      ['0', 'onFailure', '1', 'onFailure', '1'],
      /* pos 4 */
    ];

    const result1 = resolveLocations({
      destinationItems: items1,
      destinationIndex: 2 /* corresponds to pos 2, when dragging from above */,
      baseDestinationSelector: TREE_A_ROOT,
      dragDirection: 'down',
      baseSourceSelector: TREE_A_ROOT,
      sourceSelector: ['0'],
    });

    expect(result1).toEqual({
      source: ['TREE_A', '0'],
      destination: ['TREE_A', '0', 'onFailure', '1', 'onFailure', '0'],
    });

    const items2 = [
      ['0'],
      ['1'],
      ['1', 'onFailure', '0'],
      ['1', 'onFailure', '1', 'onFailure', '0'],
      ['1', 'onFailure', '1', 'onFailure', '1'],
      ['1', 'onFailure', '2'],
      ['1', 'onFailure', '3'],
    ];

    const result2 = resolveLocations({
      destinationItems: items2,
      destinationIndex: 4,
      baseDestinationSelector: TREE_A_ROOT,
      dragDirection: 'down',
      baseSourceSelector: TREE_A_ROOT,
      sourceSelector: ['0'],
    });
    expect(result2).toEqual({
      source: ['TREE_A', '0'],
      destination: ['TREE_A', '1', 'onFailure', '2'],
    });
  });

  it('drags down past an item at the same level with child elements _without_ nesting', () => {
    const items = [
      ['0'],
      ['1'],
      ['2'],
      ['2', 'onFailure', '0'],
      ['2', 'onFailure', '1'],
      ['2', 'onFailure', '2'],
      ['2', 'onFailure', '3'],
      ['3'],
      ['3', 'onFailure', '0'],
    ];
    const result = resolveLocations({
      destinationItems: items,
      destinationIndex: 6,
      baseDestinationSelector: TREE_A_ROOT,
      dragDirection: 'down',
      baseSourceSelector: TREE_A_ROOT,
      sourceSelector: ['1'],
    });
    expect(result).toEqual({ source: ['TREE_A', '1'], destination: ['TREE_A', '3'] });
  });

  it('drags a nested item to the bottom of its siblings', () => {
    const items = [
      ['0'],
      ['1'],
      ['2'],
      ['2', 'onFailure', '0'],
      ['2', 'onFailure', '1'],
      ['2', 'onFailure', '2'],
      ['2', 'onFailure', '3'],
      ['3'],
      ['3', 'onFailure', '0'],
    ];
    const result = resolveLocations({
      destinationItems: items,
      destinationIndex: 6,
      baseDestinationSelector: TREE_A_ROOT,
      dragDirection: 'down',
      baseSourceSelector: TREE_A_ROOT,
      sourceSelector: ['2', 'onFailure', '0'],
    });
    expect(result).toEqual({
      source: ['TREE_A', '2', 'onFailure', '0'],
      destination: ['TREE_A', '2', 'onFailure', '3'],
    });
  });

  it('dragging up across trees resolves correctly', () => {
    const items = [
      ['0'],
      ['1'],
      ['2'],
      ['2', 'onFailure', '0'],
      ['2', 'onFailure', '1'],
      ['2', 'onFailure', '2'],
      ['2', 'onFailure', '3'],
      ['3'],
      ['3', 'onFailure', '0'],
    ];
    const result1 = resolveLocations({
      destinationItems: items,
      destinationIndex: items.length,
      baseDestinationSelector: TREE_A_ROOT,
      dragDirection: 'up',
      baseSourceSelector: TREE_B_ROOT,
      sourceSelector: ['0'],
    });
    expect(result1).toEqual({
      source: ['TREE_B', '0'],
      destination: ['TREE_A', DragAndDropSpecialLocations.bottom],
    });

    const result2 = resolveLocations({
      destinationItems: items,
      destinationIndex: items.length - 1,
      baseDestinationSelector: TREE_A_ROOT,
      dragDirection: 'up',
      baseSourceSelector: TREE_B_ROOT,
      sourceSelector: ['0'],
    });
    expect(result2).toEqual({
      source: ['TREE_B', '0'],
      destination: ['TREE_A', '3', 'onFailure', '0'],
    });
  });
});
