/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { StatsNode } from '../../../common/containers/alerts/use_alert_prevalence_from_process_tree';

export const mockStatsNodes = [
  { id: '70e19mhyda', name: 'mimikatz.exe', parent: '92ogx18xdh' },
  { id: '92ogx18xdh', parent: 'skq89ren5b', name: 'explorer.exe' },
  { id: 'skq89ren5b', name: 'notepad.exe' },
  { id: '6b4ffkdr0r', parent: '70e19mhyda', name: 'lsass.exe' },
  { id: 'gimoywlglz', parent: '70e19mhyda', name: 'iexlorer.exe' },
  { id: 'p6t1v7jum9', parent: '70e19mhyda', name: 'notepad.exe' },
  { id: 't037f0qec3', parent: 'gimoywlglz', name: 'powershell.exe' },
  { id: '8bxu0crntu', parent: 'gimoywlglz', name: 'lsass.exe' },
  { id: 'cpsi3oaguo', parent: '6b4ffkdr0r', name: 'notepad.exe' },
] as StatsNode[];

export const mockStatsNodesHasParent = [
  { id: '70e19mhyda', name: 'mimikatz.exe', parent: '92ogx18xdh' },
  { id: '92ogx18xdh', name: 'explorer.exe' },
] as StatsNode[];

export const mockStatsNodesHasGrandparent = [
  { id: '70e19mhyda', name: 'mimikatz.exe', parent: '92ogx18xdh' },
  { id: '92ogx18xdh', parent: 'skq89ren5b', name: 'explorer.exe' },
  { id: 'skq89ren5b', name: 'notepad.exe' },
] as StatsNode[];

export const mockStatsNodesHasChildren = [
  { id: '70e19mhyda', name: 'mimikatz.exe' },
  { id: '6b4ffkdr0r', parent: '70e19mhyda', name: 'lsass.exe' },
  { id: 'gimoywlglz', parent: '70e19mhyda', name: 'iexlorer.exe' },
  { id: 'p6t1v7jum9', parent: '70e19mhyda', name: 'notepad.exe' },
] as StatsNode[];

export const mockStatsNodesMoreThanFiveChildren = [
  { id: '70e19mhyda', name: 'mimikatz.exe', parent: '92ogx18xdh' },
  { id: '6b4ffkdr0r', parent: '70e19mhyda', name: 'lsass.exe' },
  { id: 'gimoywlglz', parent: '70e19mhyda', name: 'iexlorer.exe' },
  { id: 'p6t1v7jum9', parent: '70e19mhyda', name: 'notepad.exe' },
  { id: 't037f0qec3', parent: '70e19mhyda', name: 'powershell.exe' },
  { id: '8bxu0crntu', parent: '70e19mhyda', name: 'lsass.exe' },
  { id: 'cpsi3oaguo', parent: '70e19mhyda', name: 'notepad.exe' },
] as StatsNode[];

export const mockStatsNodesHasGrandchildren = [
  { id: '70e19mhyda', name: 'mimikatz.exe' },
  { id: '6b4ffkdr0r', parent: '70e19mhyda', name: 'lsass.exe' },
  { id: 'gimoywlglz', parent: '70e19mhyda', name: 'iexlorer.exe' },
  { id: 'p6t1v7jum9', parent: '70e19mhyda', name: 'notepad.exe' },
  { id: 't037f0qec3', parent: 'gimoywlglz', name: 'powershell.exe' },
  { id: '8bxu0crntu', parent: 'gimoywlglz', name: 'lsass.exe' },
  { id: 'cpsi3oaguo', parent: '6b4ffkdr0r', name: 'notepad.exe' },
] as StatsNode[];

export const mockStatsNodesSingleNode = [
  { id: '70e19mhyda', name: 'mimikatz.exe', parent: '92ogx18xdh' },
] as StatsNode[];

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

export const mockTreeNodesHasMoreThanFiveChildren = [
  {
    label: '--> (Analyzed Event) mimikatz.exe',
    id: '70e19mhyda',
    isExpanded: true,
    children: [
      { label: '--> lsass.exe', id: '6b4ffkdr0r', isExpanded: true, children: [] },
      { label: '--> iexlorer.exe', id: 'gimoywlglz', isExpanded: true, children: [] },
      { label: '--> notepad.exe', id: 'p6t1v7jum9', isExpanded: true, children: [] },
      { label: '--> powershell.exe', id: 't037f0qec3', isExpanded: true, children: [] },
      { label: '--> lsass.exe', id: '8bxu0crntu', isExpanded: true, children: [] },
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

export const mockTreeNodesSingleNode = [
  {
    label: '--> (Analyzed Event) mimikatz.exe',
    id: '70e19mhyda',
    isExpanded: true,
    children: [],
  },
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

export const mockChildrenStatsNodes = [
  { id: '6b4ffkdr0r', parent: '70e19mhyda', name: 'lsass.exe' },
  { id: 'gimoywlglz', parent: '70e19mhyda', name: 'iexlorer.exe' },
  { id: 'p6t1v7jum9', parent: '70e19mhyda', name: 'notepad.exe' },
] as StatsNode[];

export const mockChildrenTreeNodes = [
  { label: 'lsass.exe', id: '6b4ffkdr0r', isExpanded: true, children: [] },
  { label: 'iexlorer.exe', id: 'gimoywlglz', isExpanded: true, children: [] },
  { label: 'notepad.exe', id: 'p6t1v7jum9', isExpanded: true, children: [] },
];
