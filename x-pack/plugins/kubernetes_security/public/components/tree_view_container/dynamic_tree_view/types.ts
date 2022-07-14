/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainerBool, TreeNavSelection, DynamicTree } from '../../../types';

export type DynamicTreeViewProps = {
  tree: DynamicTree[];
  depth?: number;
  selectionDepth?: TreeNavSelection;
  query: QueryDslQueryContainerBool;
  indexPattern?: string;
  onSelect: (selectionDepth: TreeNavSelection, key: string | number, type: string) => void;
  hasSelection?: boolean;
  'aria-label': string;
  selected?: string;
  expanded?: boolean;
};

export type DynamicTreeViewItemProps = Required<Omit<DynamicTreeViewProps, 'hasSelection'>> & {
  onToggleExpand: any;
  aggData: any;
  isExpanded: boolean;
};
