/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getTreeNodes, hasGrandchildren, getTreeNode } from './analyzer_helpers';
import * as mock from '../mocks/mock_analyzer_data';

it('test hasGrandchildren', () => {
  expect(hasGrandchildren([], [])).toBe(false);
  expect(hasGrandchildren([], mock.mockChildrenNodes)).toBe(false);
  expect(hasGrandchildren(mock.mockStatsNodesSingleNode, [])).toBe(false);
  expect(hasGrandchildren(mock.mockStatsNodesHasChildren, mock.mockChildrenNodes)).toBe(false);
  expect(hasGrandchildren(mock.mockStatsNodesHasGrandchildren, mock.mockChildrenNodes)).toBe(true);
});

it('test getTreeNode', () => {
  const mockTreeNode = {
    label: 'process name',
    id: 'test id',
    isExpanded: true,
    children: mock.mockChildrenTreeNodes,
  };
  const mockTreeNodeChildrenIsEmpty = {
    label: 'process name',
    id: 'test id',
    isExpanded: true,
    children: [],
  };

  expect(getTreeNode('test id', 'process name', mock.mockChildrenTreeNodes)).toStrictEqual(
    mockTreeNode
  );
  expect(getTreeNode('test id', 'process name', [])).toStrictEqual(mockTreeNodeChildrenIsEmpty);
});

describe('test getTreeNodes', () => {
  it('should return the correct tree nodes', () => {
    expect(getTreeNodes(mock.mockStatsNodes)).toStrictEqual(mock.mockTreeNodes);
    expect(getTreeNodes(mock.mockStatsNodesHasGrandparent)).toStrictEqual(
      mock.mockTreeNodesHasGrandparent
    );
    expect(getTreeNodes(mock.mockStatsNodesHasParent)).toStrictEqual(mock.mockTreeNodesHasParent);

    expect(getTreeNodes(mock.mockStatsNodesHasChildren)).toStrictEqual(
      mock.mockTreeNodesHasChildren
    );
    expect(getTreeNodes(mock.mockStatsNodesHasGrandchildren)).toStrictEqual(
      mock.mockTreeNodesHasGrandchildren
    );
    expect(getTreeNodes(mock.mockStatsNodesSingleNode)).toStrictEqual(mock.mockTreeNodesSingleNode);
  });

  it('should return the correct tree nodes with 3 children when child count limit is not passed', () => {
    expect(getTreeNodes(mock.mockStatsNodesMoreThanThreeChildren)).toStrictEqual(
      mock.mockTreeNodesHasChildren
    );
  });
  it('should return the correct number of children tree nodes when child count limit is passed', () => {
    expect(getTreeNodes(mock.mockStatsNodesMoreThanThreeChildren, 4)).toStrictEqual(
      mock.mockTreeNodesHasFourChildren
    );
    expect(getTreeNodes(mock.mockStatsNodesMoreThanThreeChildren, 0)).toStrictEqual(
      mock.mockTreeNodesSingleNode
    );
  });
  expect(getTreeNodes([])).toStrictEqual([]);
});
