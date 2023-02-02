/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ItemsetResult, SimpleHierarchicalTreeNode } from '../../../common/types';

import { getValueCounts } from './get_value_counts';
import { getValuesDescending } from './get_values_descending';

function NewNodeFactory(name: string): SimpleHierarchicalTreeNode {
  const children: SimpleHierarchicalTreeNode[] = [];

  const addNode = (node: SimpleHierarchicalTreeNode) => {
    children.push(node);
  };

  return {
    name,
    set: [],
    docCount: 0,
    pValue: 0,
    children,
    addNode,
  };
}

/**
 * Simple function that constructs a tree from an itemset DataFrame sorted by support (count)
 * The resulting tree components are non-overlapping subsets of the data.
 * In summary, we start with the most inclusive itemset (highest count), and perform a depth first search in field order.
 *
 * @param displayParent
 * @param parentDocCount
 * @param parentLabel
 * @param field
 * @param value
 * @param iss
 * @param collapseRedundant
 * @param displayOther
 * @returns
 */
function dfDepthFirstSearch(
  fields: string[],
  displayParent: SimpleHierarchicalTreeNode,
  parentDocCount: number,
  parentLabel: string,
  field: string,
  value: string,
  iss: ItemsetResult[],
  collapseRedundant: boolean,
  displayOther: boolean
) {
  const filteredItemSets = iss.filter((is) => {
    for (const [key, setValue] of Object.entries(is.set)) {
      if (key === field && setValue === value) {
        return true;
      }
    }
    return false;
  });

  if (filteredItemSets.length === 0) {
    return 0;
  }

  const docCount = Math.max(...filteredItemSets.map((fis) => fis.doc_count));
  const pValue = Math.max(...filteredItemSets.map((fis) => fis.maxPValue));
  const totalDocCount = Math.max(...filteredItemSets.map((fis) => fis.total_doc_count));

  let label = `${parentLabel} ${value}`;

  let displayNode: SimpleHierarchicalTreeNode;
  if (parentDocCount === docCount && collapseRedundant) {
    // collapse identical paths
    displayParent.name += ` ${value}`;
    displayParent.set.push({ fieldName: field, fieldValue: value });
    displayParent.docCount = docCount;
    displayParent.pValue = pValue;
    displayNode = displayParent;
  } else {
    displayNode = NewNodeFactory(`${docCount}/${totalDocCount}${label}`);
    displayNode.set = [...displayParent.set];
    displayNode.set.push({ fieldName: field, fieldValue: value });
    displayNode.docCount = docCount;
    displayNode.pValue = pValue;
    displayParent.addNode(displayNode);
  }

  let nextField: string;
  while (true) {
    const nextFieldIndex = fields.indexOf(field) + 1;
    if (nextFieldIndex >= fields.length) {
      return docCount;
    }
    nextField = fields[nextFieldIndex];

    // TODO - add handling of creating * as next level of tree

    if (Object.keys(getValueCounts(filteredItemSets, nextField)).length > 0) {
      break;
    } else {
      field = nextField;
      if (collapseRedundant) {
        // add dummy node label
        displayNode.name += ` '*'`;
        label += ` '*'`;
        const nextDisplayNode = NewNodeFactory(`${docCount}/${totalDocCount}${label}`);
        nextDisplayNode.set = displayNode.set;
        nextDisplayNode.docCount = docCount;
        nextDisplayNode.pValue = pValue;
        displayNode.addNode(nextDisplayNode);
        displayNode = nextDisplayNode;
      }
    }
  }

  let subCount = 0;
  for (const nextValue of getValuesDescending(filteredItemSets, nextField)) {
    subCount += dfDepthFirstSearch(
      fields,
      displayNode,
      docCount,
      label,
      nextField,
      nextValue,
      filteredItemSets,
      collapseRedundant,
      displayOther
    );
  }

  if (displayOther) {
    if (subCount < docCount) {
      displayNode.addNode(
        NewNodeFactory(`${docCount - subCount}/${totalDocCount}${parentLabel} '{value}' 'OTHER`)
      );
    }
  }

  return docCount;
}

/**
 * Create simple tree consisting or non-overlapping sets of data.
 *
 * By default (fields==None), the field search order is dependent on the highest count itemsets.
 */
export function getSimpleHierarchicalTree(
  df: ItemsetResult[],
  collapseRedundant: boolean,
  displayOther: boolean,
  fields: string[] = []
) {
  const field = fields[0];

  const totalDocCount = Math.max(...df.map((d) => d.total_doc_count));

  const newRoot = NewNodeFactory('');

  for (const value of getValuesDescending(df, field)) {
    dfDepthFirstSearch(
      fields,
      newRoot,
      totalDocCount + 1,
      '',
      field,
      value,
      df,
      collapseRedundant,
      displayOther
    );
  }

  return { root: newRoot, fields };
}
