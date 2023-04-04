/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getTreeNodes, hasGrandchildren, makeTreeNode } from './analyzer_helpers';
import * as mock from '../mocks/mock_analyzer_data';

it('test hasGrandchildren', () => {
  expect(hasGrandchildren(mock.mockStatsNodesSingleNode, [])).toBe(false);
  expect(hasGrandchildren(mock.mockStatsNodesHasChildren, mock.mockChildrenStatsNodes)).toBe(false);
  expect(hasGrandchildren(mock.mockStatsNodesHasGrandchildren, mock.mockChildrenStatsNodes)).toBe(
    true
  );
});

it('test makeTreeNode', () => {
  const mockTreeNode = {
    label: 'process name',
    id: 'test id',
    isExpanded: true,
    children: mock.mockChildrenTreeNodes,
  };
  const mockTreeNodeEmpty = {
    label: 'process name',
    id: 'test id',
    isExpanded: true,
    children: [],
  };

  expect(makeTreeNode('test id', 'process name', mock.mockChildrenTreeNodes)).toStrictEqual(
    mockTreeNode
  );
  expect(makeTreeNode('test id', 'process name', [])).toStrictEqual(mockTreeNodeEmpty);
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

  it('should return the correct number of children tree nodes when child count limit is passed', () => {
    expect(getTreeNodes(mock.mockStatsNodesMoreThanFiveChildren, 3)).toStrictEqual(
      mock.mockTreeNodesHasChildren
    );
  });
});
