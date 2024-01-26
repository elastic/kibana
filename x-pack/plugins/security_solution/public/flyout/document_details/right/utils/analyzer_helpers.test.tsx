/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getTreeNodes, getAncestorTreeNodes, getDescendantTreeNodes } from './analyzer_helpers';
import {
  mockStatsNode,
  mockStatsNodesHasParent,
  mockStatsNodesHasGrandparent,
  mockStatsNodesHasChildren,
  mockStatsNodesHasGrandchildren,
  mockStatsNodes,
  mockTreeNode,
  mockParentTreeNode,
  mockGrandparentTreeNode,
  mockTreeNodesMoreAncestors,
  mockTreeNodesHasChildren,
  mockTreeNodesHasGrandchildren,
  mockTreeNodesChildHasMoreDescendants,
  mockTreeNodesMoreDescendants,
} from '../mocks/mock_analyzer_data';

const childCountLimit = 3;
const descendantLevel = 1;
const idx = 0;

describe('test getAncestorTreeNodes', () => {
  it('should return current tree node if ancestor level or idx is invalid', () => {
    expect(getAncestorTreeNodes([mockStatsNode], mockStatsNode, mockTreeNode, -1, 0)).toStrictEqual(
      mockTreeNode
    );
    expect(getAncestorTreeNodes([mockStatsNode], mockStatsNode, mockTreeNode, 0, -1)).toStrictEqual(
      mockTreeNode
    );
  });

  it('should return tree nodes up to the specified ancestor level', () => {
    // stats nodes: [node]  ->> tree nodes: [node]
    expect(
      getAncestorTreeNodes([mockStatsNode], mockStatsNode, mockTreeNode, 0, idx)
    ).toStrictEqual(mockTreeNode);
    expect(
      getAncestorTreeNodes([mockStatsNode], mockStatsNode, mockTreeNode, 1, idx)
    ).toStrictEqual(mockTreeNode);

    // stats nodes: [parent, node]  ->> tree nodes: [parent, node]
    expect(
      getAncestorTreeNodes(mockStatsNodesHasParent, mockStatsNode, mockTreeNode, 1, idx)
    ).toStrictEqual(mockParentTreeNode);

    // stats nodes: [grandparent, parent, node] ->> tree nodes: [grandparent, parent, node]
    expect(
      getAncestorTreeNodes(mockStatsNodesHasGrandparent, mockStatsNode, mockTreeNode, 2, idx)
    ).toStrictEqual(mockGrandparentTreeNode);
  });

  it('should return a ... top tree node if more ancestors are available', () => {
    // stats nodes: [parent, node]  ->> tree nodes: [..., node]
    expect(
      getAncestorTreeNodes(mockStatsNodesHasParent, mockStatsNode, mockTreeNode, 0, idx)
    ).toStrictEqual({
      ...mockTreeNodesMoreAncestors,
      children: [mockTreeNode],
    });

    // stats nodes: [grandparent, parent, node] ->> tree nodes: [..., parent, node]
    expect(
      getAncestorTreeNodes(mockStatsNodesHasGrandparent, mockStatsNode, mockTreeNode, 1, idx)
    ).toStrictEqual({
      ...mockTreeNodesMoreAncestors,
      children: [mockParentTreeNode],
    });
  });
});

describe('test getDecendantTreeNodes', () => {
  describe('should return correct tree nodes based on descendant level', () => {
    it('should return undefined if child limit, descendant level or idx is invalid', () => {
      expect(getDescendantTreeNodes([mockStatsNode], mockStatsNode, -1, 0, 0)).toBe(undefined);
      expect(getDescendantTreeNodes([mockStatsNode], mockStatsNode, 0, -1, 0)).toBe(undefined);
      expect(getDescendantTreeNodes([mockStatsNode], mockStatsNode, 0, 0, -1)).toBe(undefined);
    });

    it('should return tree nodes down to the specified descendant level', () => {
      // stats nodes: [node]  ->> tree nodes: undefined
      expect(getDescendantTreeNodes([mockStatsNode], mockStatsNode, childCountLimit, 0, idx)).toBe(
        undefined
      );
      expect(getDescendantTreeNodes([mockStatsNode], mockStatsNode, childCountLimit, 1, idx)).toBe(
        undefined
      );

      // stats nodes: [node, children]  ->> tree nodes: [children]
      expect(
        getDescendantTreeNodes(mockStatsNodesHasChildren, mockStatsNode, childCountLimit, 1, idx)
      ).toStrictEqual(mockTreeNodesHasChildren);

      // stats nodes: [node, children, grandchildren]  ->> tree nodes: [children, grandchildren]
      expect(
        getDescendantTreeNodes(
          mockStatsNodesHasGrandchildren,
          mockStatsNode,
          childCountLimit,
          2,
          idx
        )
      ).toStrictEqual(mockTreeNodesHasGrandchildren);
    });

    it('should return a ... child node for lowest level children if more descendants are available', () => {
      // stats nodes: [node, children]  ->> tree nodes: [...]
      expect(
        getDescendantTreeNodes(mockStatsNodesHasChildren, mockStatsNode, childCountLimit, 0, idx)
      ).toStrictEqual([mockTreeNodesMoreDescendants]);

      // stats nodes: [node, children, grandchildren] ->> tree nodes: [children,  ...]
      expect(
        getDescendantTreeNodes(
          mockStatsNodesHasGrandchildren,
          mockStatsNode,
          childCountLimit,
          1,
          idx
        )
      ).toStrictEqual(mockTreeNodesChildHasMoreDescendants);
    });
  });

  describe('should return correct tree nodes based on child count limit', () => {
    it('should return n=child count limit child(ren) node(s) followed by ... if more children are available', () => {
      expect(
        getDescendantTreeNodes(mockStatsNodesHasChildren, mockStatsNode, 0, descendantLevel, idx)
      ).toStrictEqual([{ id: `more-child`, label: '...' }]);
    });

    expect(
      getDescendantTreeNodes(mockStatsNodesHasChildren, mockStatsNode, 1, descendantLevel, idx)
    ).toStrictEqual([mockTreeNodesHasChildren[0], { id: `more-child`, label: '...' }]);

    expect(
      getDescendantTreeNodes(mockStatsNodesHasChildren, mockStatsNode, 3, descendantLevel, idx)
    ).toStrictEqual(mockTreeNodesHasChildren);
  });
});

describe('test getTreeNodes', () => {
  it('should return correct tree nodes based on parameters', () => {
    // stats nodes: [node]
    // child count: 3, ancestor level: 1, descendant level: 1
    // ->> tree nodes: [node]
    expect(getTreeNodes([mockStatsNode], childCountLimit, 1, 1)).toStrictEqual([mockTreeNode]);

    // stats nodes: [grandparent, parent, node, children, grandchildren]
    // child count: 3, ancestor level: 1, descendant level: 1
    // tree nodes: [..., parent, node, children, ...]
    expect(getTreeNodes(mockStatsNodes, childCountLimit, 1, 1)).toStrictEqual([
      {
        ...mockTreeNodesMoreAncestors,
        children: [
          {
            ...mockParentTreeNode,
            children: [{ ...mockTreeNode, children: mockTreeNodesChildHasMoreDescendants }],
          },
        ],
      },
    ]);
  });
});
