/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantTerm, FieldValuePair } from '@kbn/ml-agg-utils';

export interface SignificantTermDuplicateGroup {
  keys: Pick<SignificantTerm, keyof SignificantTerm>;
  group: SignificantTerm[];
}

export type FieldValuePairCounts = Record<string, Record<string, number>>;

export interface ItemsetResult {
  set: Record<FieldValuePair['fieldName'], FieldValuePair['fieldValue']>;
  size: number;
  maxPValue: number;
  doc_count: number;
  support: number;
  total_doc_count: number;
}

interface SimpleHierarchicalTreeNodeSet extends FieldValuePair {
  docCount: number;
  pValue: number | null;
}

export interface SimpleHierarchicalTreeNode {
  name: string;
  set: SimpleHierarchicalTreeNodeSet[];
  docCount: number;
  pValue: number | null;
  children: SimpleHierarchicalTreeNode[];
  addNode: (node: SimpleHierarchicalTreeNode) => void;
}
