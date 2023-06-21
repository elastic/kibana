/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { StatsNode } from '../../../common/containers/alerts/use_alert_prevalence_from_process_tree';

const mockNode: StatsNode = {
  id: '70e19mhyda',
  name: 'mimikatz.exe',
  parent: '92ogx18xdh',
  data: {},
  stats: {
    total: 2,
    byCategory: { alerts: 2 },
  },
};

const mockParentNodeNoGrandparent: StatsNode = {
  id: '92ogx18xdh',
  name: 'explorer.exe',
  data: {},
  stats: {
    total: 0,
    byCategory: {},
  },
};

const mockParentNode: StatsNode = {
  ...mockParentNodeNoGrandparent,
  parent: 'skq89ren5b',
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
    id: 'gimoywlglz',
    parent: '70e19mhyda',
    name: 'iexlorer.exe',
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
];

const mockExtraChildrenNodes: StatsNode[] = [
  {
    id: 'rxccek8vqu',
    parent: '70e19mhyda',
    name: 'powershell.exe',
    data: {},
    stats: {
      total: 0,
      byCategory: {},
    },
  },
  {
    id: 'mq0n2g7093',
    parent: '70e19mhyda',
    name: 'exlorer.exe',
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

export const mockStatsNodesSingleNode: StatsNode[] = [mockNode];

export const mockStatsNodesHasParent: StatsNode[] = [mockNode, mockParentNodeNoGrandparent];

export const mockStatsNodesHasGrandparent: StatsNode[] = [
  mockNode,
  mockParentNode,
  mockGrandparentNode,
];

export const mockStatsNodesHasChildren: StatsNode[] = [mockNode, ...mockChildrenNodes];

export const mockStatsNodesMoreThanThreeChildren: StatsNode[] = [
  mockNode,
  ...mockChildrenNodes,
  ...mockExtraChildrenNodes,
];

export const mockStatsNodesHasGrandchildren: StatsNode[] = [
  mockNode,
  ...mockChildrenNodes,
  ...mockGrandchildrenNodes,
];

export const mockStatsNodes: StatsNode[] = [
  mockNode,
  mockParentNode,
  mockGrandparentNode,
  ...mockChildrenNodes,
  ...mockGrandchildrenNodes,
];

export const mockTreeNodesSingleNode = [
  {
    label: '--> (Analyzed Event) mimikatz.exe',
    id: '70e19mhyda',
    isExpanded: true,
    children: [],
  },
];

export const mockTreeNodesHasParent = [
  {
    label: '--> explorer.exe',
    id: '92ogx18xdh',
    isExpanded: true,
    children: [
      {
        label: '--> (Analyzed Event) mimikatz.exe',
        id: '70e19mhyda',
        isExpanded: true,
        children: [],
      },
    ],
  },
];

export const mockTreeNodesHasGrandparent = [
  {
    label: '...',
    id: 'grandparent',
    isExpanded: true,
    children: [
      {
        label: '--> explorer.exe',
        id: '92ogx18xdh',
        isExpanded: true,
        children: [
          {
            label: '--> (Analyzed Event) mimikatz.exe',
            id: '70e19mhyda',
            isExpanded: true,
            children: [],
          },
        ],
      },
    ],
  },
];

export const mockTreeNodesHasChildren = [
  {
    label: '--> (Analyzed Event) mimikatz.exe',
    id: '70e19mhyda',
    isExpanded: true,
    children: [
      { label: '--> lsass.exe', id: '6b4ffkdr0r', isExpanded: true, children: [] },
      { label: '--> iexlorer.exe', id: 'gimoywlglz', isExpanded: true, children: [] },
      { label: '--> notepad.exe', id: 'p6t1v7jum9', isExpanded: true, children: [] },
    ],
  },
];

export const mockTreeNodesHasFourChildren = [
  {
    label: '--> (Analyzed Event) mimikatz.exe',
    id: '70e19mhyda',
    isExpanded: true,
    children: [
      { label: '--> lsass.exe', id: '6b4ffkdr0r', isExpanded: true, children: [] },
      { label: '--> iexlorer.exe', id: 'gimoywlglz', isExpanded: true, children: [] },
      { label: '--> notepad.exe', id: 'p6t1v7jum9', isExpanded: true, children: [] },
      { label: '--> powershell.exe', id: 'rxccek8vqu', isExpanded: true, children: [] },
    ],
  },
];

export const mockTreeNodesHasGrandchildren = [
  {
    label: '--> (Analyzed Event) mimikatz.exe',
    id: '70e19mhyda',
    isExpanded: true,
    children: [
      { label: '--> lsass.exe', id: '6b4ffkdr0r', isExpanded: true, children: [] },
      { label: '--> iexlorer.exe', id: 'gimoywlglz', isExpanded: true, children: [] },
      { label: '--> notepad.exe', id: 'p6t1v7jum9', isExpanded: true, children: [] },
    ],
  },

  { label: '...', id: 'grandchild', isExpanded: true, children: [] },
];

export const mockTreeNodes = [
  {
    label: '...',
    id: 'grandparent',
    isExpanded: true,
    children: [
      {
        label: '--> explorer.exe',
        id: '92ogx18xdh',
        isExpanded: true,
        children: [
          {
            label: '--> (Analyzed Event) mimikatz.exe',
            id: '70e19mhyda',
            isExpanded: true,
            children: [
              { label: '--> lsass.exe', id: '6b4ffkdr0r', isExpanded: true, children: [] },
              { label: '--> iexlorer.exe', id: 'gimoywlglz', isExpanded: true, children: [] },
              { label: '--> notepad.exe', id: 'p6t1v7jum9', isExpanded: true, children: [] },
            ],
          },
        ],
      },
    ],
  },
  { label: '...', id: 'grandchild', isExpanded: true, children: [] },
];

export const mockChildrenTreeNodes = [
  { label: 'lsass.exe', id: '6b4ffkdr0r', isExpanded: true, children: [] },
  { label: 'iexlorer.exe', id: 'gimoywlglz', isExpanded: true, children: [] },
  { label: 'notepad.exe', id: 'p6t1v7jum9', isExpanded: true, children: [] },
];
