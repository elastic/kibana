/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiToken } from '@elastic/eui';
import type { Node } from '@elastic/eui/src/components/tree_view/tree_view';
import type { StatsNode } from '../../shared/hooks/use_alert_prevalence_from_process_tree';

export const mockStatsNode: StatsNode = {
  id: '70e19mhyda',
  name: 'mimikatz.exe',
  parent: '92ogx18xdh',
  data: {},
  stats: {
    total: 2,
    byCategory: { alerts: 2 },
  },
};

const mockParentNode: StatsNode = {
  id: '92ogx18xdh',
  name: 'explorer.exe',
  parent: 'skq89ren5b',
  data: {},
  stats: {
    total: 0,
    byCategory: {},
  },
};

const mockGrandparentNode: StatsNode = {
  id: 'skq89ren5b',
  name: 'notepad.exe',
  data: {},
  stats: {
    total: 0,
    byCategory: {},
  },
};

export const mockChildrenNodes: StatsNode[] = [
  {
    id: '6b4ffkdr0r',
    parent: '70e19mhyda',
    name: 'lsass.exe',
    data: {},
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: 'p6t1v7jum9',
    parent: '70e19mhyda',
    name: 'notepad.exe',
    data: {},
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: 'gimoywlglz',
    parent: '70e19mhyda',
    name: 'iexlorer.exe',
    data: {},
    stats: {
      total: 0,
      byCategory: {},
    },
  },
];

const mockGrandchildrenNodes: StatsNode[] = [
  {
    id: 't037f0qec3',
    parent: 'gimoywlglz',
    name: 'powershell.exe',
    data: {},
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: '8bxu0crntu',
    parent: 'gimoywlglz',
    name: 'lsass.exe',
    data: {},
    stats: {
      total: 0,
      byCategory: {},
    },
  },
];

export const mockStatsNodesHasParent: StatsNode[] = [mockStatsNode, mockParentNode];

export const mockStatsNodesHasGrandparent: StatsNode[] = [
  mockStatsNode,
  mockParentNode,
  mockGrandparentNode,
];

export const mockStatsNodesHasChildren: StatsNode[] = [mockStatsNode, ...mockChildrenNodes];

export const mockStatsNodesHasGrandchildren: StatsNode[] = [
  mockStatsNode,
  ...mockChildrenNodes,
  ...mockGrandchildrenNodes,
];

export const mockStatsNodes: StatsNode[] = [
  mockStatsNode,
  mockParentNode,
  mockGrandparentNode,
  ...mockChildrenNodes,
  ...mockGrandchildrenNodes,
];

export const mockTreeNode: Node = {
  label: React.createElement('b', {}, 'mimikatz.exe'),
  id: '70e19mhyda',
  isExpanded: true,
  children: undefined,
  icon: React.createElement(EuiToken, { iconType: 'tokenConstant' }),
};

export const mockParentTreeNode: Node = {
  label: 'explorer.exe',
  id: '92ogx18xdh',
  isExpanded: true,
  children: [mockTreeNode],
};

export const mockGrandparentTreeNode: Node = {
  label: 'notepad.exe',
  id: 'skq89ren5b',
  isExpanded: true,
  children: [mockParentTreeNode],
};

export const mockTreeNodesMoreAncestors: Node = {
  label: '...',
  id: 'ancestor',
  isExpanded: true,
};

export const mockTreeNodesHasChildren = [
  { label: 'lsass.exe', id: '6b4ffkdr0r', isExpanded: false, children: undefined },
  { label: 'notepad.exe', id: 'p6t1v7jum9', isExpanded: false, children: undefined },
  { label: 'iexlorer.exe', id: 'gimoywlglz', isExpanded: false, children: undefined },
];

export const mockTreeNodesHasGrandchildren = [
  { label: 'lsass.exe', id: '6b4ffkdr0r', isExpanded: false, children: undefined },
  {
    label: 'notepad.exe',
    id: 'p6t1v7jum9',
    isExpanded: false,
    children: undefined,
  },
  {
    label: 'iexlorer.exe',
    id: 'gimoywlglz',
    isExpanded: false,
    children: [
      { label: 'powershell.exe', id: 't037f0qec3', isExpanded: false, children: undefined },
      { label: 'lsass.exe', id: '8bxu0crntu', isExpanded: false, children: undefined },
    ],
  },
];

export const mockTreeNodesMoreDescendants: Node = {
  label: '...',
  id: 'descendant',
  isExpanded: false,
};

export const mockTreeNodesChildHasMoreDescendants = [
  { label: 'lsass.exe', id: '6b4ffkdr0r', isExpanded: false, children: undefined },
  { label: 'notepad.exe', id: 'p6t1v7jum9', isExpanded: false, children: undefined },
  {
    label: 'iexlorer.exe',
    id: 'gimoywlglz',
    isExpanded: false,
    children: [mockTreeNodesMoreDescendants],
  },
];
