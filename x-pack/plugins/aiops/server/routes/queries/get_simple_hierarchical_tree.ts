/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { omit, uniq } from 'lodash';

import type { ChangePointGroup, FieldValuePair } from '@kbn/ml-agg-utils';
import { stringHash } from '@kbn/ml-string-hash';

import type { ItemsetResult } from './fetch_frequent_items';

function getValueCounts(df: ItemsetResult[], field: string) {
  return df.reduce<Record<string, number>>((p, c) => {
    if (c.set[field] === undefined) {
      return p;
    }
    p[c.set[field]] = p[c.set[field]] ? p[c.set[field]] + 1 : 1;
    return p;
  }, {});
}

function getValuesDescending(df: ItemsetResult[], field: string): string[] {
  const valueCounts = getValueCounts(df, field);
  const keys = Object.keys(valueCounts);

  return keys.sort((a, b) => {
    return valueCounts[b] - valueCounts[a];
  });
}

interface NewNode {
  name: string;
  set: FieldValuePair[];
  docCount: number;
  pValue: number | null;
  children: NewNode[];
  icon: string;
  iconStyle: string;
  addNode: (node: NewNode) => void;
}

function NewNodeFactory(name: string): NewNode {
  const children: NewNode[] = [];

  const addNode = (node: NewNode) => {
    children.push(node);
  };

  return {
    name,
    set: [],
    docCount: 0,
    pValue: 0,
    children,
    icon: 'default',
    iconStyle: 'default',
    addNode,
  };
}

/**
 * Simple (poorly implemented) function that constructs a tree from an itemset DataFrame sorted by support (count)
 * The resulting tree components are non-overlapping subsets of the data.
 * In summary, we start with the most inclusive itemset (highest count), and perform a depth first search in field order.
 *
 * TODO - the code style here is hacky and should be re-written
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
  displayParent: NewNode,
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

  let displayNode: NewNode;
  if (parentDocCount === docCount && collapseRedundant) {
    // collapse identical paths
    displayParent.name += ` ${value}`;
    displayParent.set.push({ fieldName: field, fieldValue: value });
    displayParent.docCount = docCount;
    displayParent.pValue = pValue;
    displayNode = displayParent;
  } else {
    displayNode = NewNodeFactory(`${docCount}/${totalDocCount}${label}`);
    displayNode.iconStyle = 'warning';
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
      displayNode.icon = 'file';
      displayNode.iconStyle = 'info';
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
        nextDisplayNode.iconStyle = 'warning';
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
  // const candidates = uniq(
  //   df.flatMap((d) =>
  //     Object.keys(omit(d, ['size', 'maxPValue', 'doc_count', 'support', 'total_doc_count']))
  //   )
  // );

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

/**
 * Get leaves from hierarchical tree.
 */
export function getSimpleHierarchicalTreeLeaves(
  tree: NewNode,
  leaves: ChangePointGroup[],
  level = 1
) {
  if (tree.children.length === 0) {
    leaves.push({
      id: `${stringHash(JSON.stringify(tree.set))}`,
      group: tree.set,
      docCount: tree.docCount,
      pValue: tree.pValue,
    });
  } else {
    for (const child of tree.children) {
      const newLeaves = getSimpleHierarchicalTreeLeaves(child, [], level + 1);
      if (newLeaves.length > 0) {
        leaves.push(...newLeaves);
      }
    }
  }

  if (leaves.length === 1 && leaves[0].group.length === 0 && leaves[0].docCount === 0) {
    return [];
  }

  return leaves;
}

type FieldValuePairCounts = Record<string, Record<string, number>>;
/**
 * Get a nested record of field/value pairs with counts
 */
export function getFieldValuePairCounts(cpgs: ChangePointGroup[]): FieldValuePairCounts {
  return cpgs.reduce<FieldValuePairCounts>((p, { group }) => {
    group.forEach(({ fieldName, fieldValue }) => {
      if (p[fieldName] === undefined) {
        p[fieldName] = {};
      }
      p[fieldName][fieldValue] = p[fieldName][fieldValue] ? p[fieldName][fieldValue] + 1 : 1;
    });
    return p;
  }, {});
}

/**
 * Analyse duplicate field/value pairs in change point groups.
 */
export function markDuplicates(
  cpgs: ChangePointGroup[],
  fieldValuePairCounts: FieldValuePairCounts
): ChangePointGroup[] {
  return cpgs.map((cpg) => {
    return {
      ...cpg,
      group: cpg.group.map((g) => {
        return {
          ...g,
          duplicate: fieldValuePairCounts[g.fieldName][g.fieldValue] > 1,
        };
      }),
    };
  });
}
