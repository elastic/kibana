/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';

import { Items } from './data_visualizer';

export function ItemSetFactory(
  items: Items,
  maxItemCount: number,
  count: number,
  totalCount: number,
  pValue: number,
  minPValue: number
) {
  const logTinySignificance = Math.log(Number.MIN_VALUE);

  function size() {
    return Object.keys(items).reduce((p, c) => {
      return p + items[c].length;
    }, 0);
  }

  function contains(other: ItemSet) {
    if (other.size <= size()) {
      return false;
    }

    let containsOther = false;

    // console.log('--- items', items);
    for (const name of Object.keys(items)) {
      const value = items[name];
      // console.log('item name', name, other.items, items);
      if (other.items[name] !== undefined && isEqual(other.items[name], value)) {
        containsOther = true;
      }
    }

    return containsOther;
  }

  function similarity(other: ItemSet) {
    const recordsSimilarity = other.count / count;
    const fieldsSimilarity = size() / other.size;
    return 0.8 * recordsSimilarity + 0.2 * fieldsSimilarity;
  }

  function quality() {
    const importance = count / totalCount;
    const specificity = Math.sqrt(size()) / maxItemCount;
    const significance =
      Math.max(Math.log(pValue), logTinySignificance) /
      Math.max(Math.log(minPValue), logTinySignificance);

    return 0.6 * importance + 0.3 * specificity + 0.1 * significance;
  }

  return {
    items,
    maxItemCount,
    count,
    totalCount,
    pValue,
    minPValue,
    logTinySignificance,
    contains,
    quality: quality(),
    size: size(),
    similarity,
  };
}
type ItemSet = ReturnType<typeof ItemSetFactory>;

export interface ItemSetTreeNode {
  itemSet: ItemSet;
  edges: ItemSetTreeNode[];
  parent: ItemSetTreeNode | null;
  selectedCluster: () => boolean;
  children: () => ItemSetTreeNode[];
  computeQuality: () => number;
  couldAdd: (otherItemSet: ItemSet) => boolean;
  dominated: () => boolean;
  addChild: (otherItemSet: ItemSet) => ItemSetTreeNode;
  addEdge: (node: ItemSetTreeNode) => void;
  allLeaves: () => ItemSetTreeNode[];
  quality: () => number;
  removeChild: (node: ItemSetTreeNode) => void;
  removeLowQualityNodes: (minQualityRatio: number) => void;
  removeChildrenBelowQualityThreshold: (minQualityRation: number) => void;
  similarity: (otherItemSet: ItemSet) => number;
  sortByQuality: () => void;
}

function ItemSetTreeNodeFactory(itemSet: ItemSet): ItemSetTreeNode {
  let children: ItemSetTreeNode[] = [];
  const edges: ItemSetTreeNode[] = [];
  const parent = null;
  let quality = itemSet.quality;
  let selectedCluster = false;

  // Get all leaves of the branch rooted at this node.
  function allLeaves(): ItemSetTreeNode[] {
    const result: ItemSetTreeNode[] = [];

    if (isLeaf()) {
      result.push(getThisNode());
    }

    for (const child of children) {
      result.push(...child.allLeaves());
    }

    return result;
  }

  // A node is dominated by another if it contains that node's item set
  // and its quality is lower.
  function dominated() {
    // Here we traverse the DAG view to find all candidates.
    const workingSet = edges;

    while (workingSet.length > 0) {
      const node = workingSet.pop();
      if (node !== undefined) {
        if (node?.quality() > quality) {
          return true;
        }
        workingSet.push(...node.edges);
      }
    }

    return false;
  }

  function similarity(otherItemSet: ItemSet) {
    return itemSet.similarity(otherItemSet);
  }

  // Check if we should add item_set as a child of this node.
  function couldAdd(otherItemSet: ItemSet) {
    if (itemSet.size === 0) {
      return true;
    }

    if (itemSet.contains(otherItemSet)) {
      for (const node of edges) {
        if (node.itemSet.contains(otherItemSet)) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  function addChild(otherItemSet: ItemSet) {
    children.push(ItemSetTreeNodeFactory(otherItemSet));
    children[children.length - 1].parent = getThisNode();
    return children[children.length - 1];
  }

  function removeChild(node: ItemSetTreeNode) {
    children = children.filter((child) => child !== node);
  }

  function addEdge(node: ItemSetTreeNode) {
    edges.push(node);
  }

  function isLeaf() {
    return children.length === 0;
  }

  function isRoot() {
    return parent === null && itemSet.size === 0;
  }

  function sortByQuality() {
    children = children.sort((a, b) => b.quality() - a.quality());
    for (const child of children) {
      child.sortByQuality();
    }
  }

  // We use a post order depth first traversal of the tree.
  //
  // At each point we keep track of the quality of the best representation
  // (highest quality) we've found so far and compare to collapsing to a
  // common ancestor.
  //
  // This is essentially a dynamic program to find the collection of item
  // sets which represents the global minimum of the quality function.
  function computeQuality() {
    if (isLeaf()) {
      return quality;
    }

    // We use a weighted average of the child qualities. This means that we
    // select for the case any child accounts for the majority of the node's
    // documents.

    let currentBestRepresentationQuality = 0;
    let extra = itemSet.count;

    for (const child of children) {
      extra -= child.itemSet.count;
    }

    extra = Math.max(extra, 0);

    let Z = 0;

    for (const child of children) {
      currentBestRepresentationQuality += (child.itemSet.count + extra) * child.computeQuality();
      Z += child.itemSet.count + extra;
    }

    currentBestRepresentationQuality /= Z;

    if (quality < currentBestRepresentationQuality) {
      quality = currentBestRepresentationQuality;
    } else {
      selectedCluster = isRoot() === false;
    }

    return quality;
  }

  // We use two conditions here:
  // 1. The node quality is less than k * parent quality
  // 2. The node is a leaf and is dominated by another node in the tree.
  function removeLowQualityNodes(minQualityRatio: number) {
    removeChildrenBelowQualityThreshold(minQualityRatio);
    removeDominatedLeaves();
  }

  function removeChildrenBelowQualityThreshold(minQualityRatio: number) {
    children = children.filter((child) => {
      return child.quality() > minQualityRatio * quality;
    });
    for (const child of children) {
      child.removeChildrenBelowQualityThreshold(minQualityRatio);
    }
  }

  function removeDominatedLeaves() {
    while (true) {
      const workingSet = allLeaves();
      let finished = true;

      for (const node of workingSet) {
        if (node.parent !== null && node.dominated()) {
          node.parent.removeChild(node);
          finished = false;
        }
      }

      if (finished) {
        break;
      }
    }
  }

  function getThisNode(): ItemSetTreeNode {
    return {
      itemSet,
      children: () => children,
      edges,
      parent,
      quality: () => quality,
      selectedCluster: () => selectedCluster,
      computeQuality,
      couldAdd,
      dominated,
      addChild,
      addEdge,
      allLeaves,
      removeChild,
      removeLowQualityNodes,
      removeChildrenBelowQualityThreshold,
      similarity,
      sortByQuality,
    };
  }

  return getThisNode();
}

export interface NewNode {
  name: string;
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
    children,
    icon: 'default',
    iconStyle: 'default',
    addNode,
  };
}

// A tree representation by inclusion of frequent item sets.
export function ItemSetTreeFactory(
  fields: string[],
  itemSets: ItemSet[],
  maxItemCount: number,
  totalCount: number,
  minPValue: number,
  minQualityRatioRaw = 0.6,
  parentQualityWeight = 0.8,
  parentSimilarityWeight = 0.2
) {
  const root = ItemSetTreeNodeFactory(
    ItemSetFactory({}, maxItemCount, 0, totalCount, 1, minPValue)
  );

  const minQualityRatio = Math.min(Math.max(minQualityRatioRaw, 0), 1);

  function buildTree() {
    itemSets.sort((a, b) => {
      if (b.size === a.size) {
        return b.quality - a.quality;
      }
      return a.size - b.size;
    });

    const workingNodes = [root];

    for (const itemSet of itemSets) {
      const candidateNodes: ItemSetTreeNode[] = [];

      for (const node of workingNodes) {
        if (node.couldAdd(itemSet)) {
          candidateNodes.push(node);
        }
      }

      if (candidateNodes.length > 0) {
        // Order the candidate parent nodes by suitability.
        candidateNodes.sort((a, b) => {
          const av =
            parentSimilarityWeight * a.similarity(itemSet) + parentQualityWeight * a.quality();
          const bv =
            parentSimilarityWeight * b.similarity(itemSet) + parentQualityWeight * b.quality();

          return bv - av;
        });

        // Update the tree.
        workingNodes.push(candidateNodes[candidateNodes.length - 1].addChild(itemSet));

        // Update the DAG.
        for (const node of candidateNodes) {
          node.addEdge(workingNodes[workingNodes.length - 1]);
        }
      }
    }

    root.computeQuality();
    root.removeLowQualityNodes(minQualityRatio);
    root.computeQuality();
    root.sortByQuality();
  }

  // Simple (poorly implemented) function that constructs a tree from an itemset DataFrame sorted by support (count)
  // The resulting tree components are non-overlapping subsets of the data.
  // In summary, we start with the most inclusive itemset (highest count), and perform a depth first search in field
  // order.

  // TODO - the code style here is hacky and should be re-written
  function dfDepthFirstSearch(
    displayParent: NewNode,
    parentDocCount: number,
    parentLabel: string,
    field: string,
    value: string,
    iss: ItemSet[],
    collapseRedundant: boolean,
    displayOther: boolean
  ) {
    // df = df[df[field] == value].copy(deep=True)
    // if len(df) == 0:
    //     return 0
    const filteredItemSets = iss.filter((is) => {
      for (const [key, values] of Object.entries(is.items)) {
        if (key === field && values.includes(value)) {
          return true;
        }
      }
      return false;
    });

    // doc_count = df['doc_count'].max()
    // total_doc_count = df['total_doc_count'].max()
    const docCount = Math.max(...filteredItemSets.map((fis) => fis.count));
    const totalDocCount = totalCount;

    // label = f"{parent_label} '{value}'"
    let label = `${parentLabel} ${value}`;

    // if parent_doc_count == doc_count and collapse_redundant:
    //     # collapse identical paths
    //     display_parent.name += f" '{value}'"
    //     display_node = display_parent
    // else:
    //     display_node = ipytree.Node(f"{doc_count}/{total_doc_count}{label}")
    //     display_node.icon_style = 'warning'
    //     display_parent.add_node(display_node)
    let displayNode: NewNode;
    if (parentDocCount === docCount && collapseRedundant) {
      // collapse identical paths
      displayParent.name += ` '${value}`;
      displayNode = displayParent;
    } else {
      displayNode = NewNodeFactory(`${docCount}/${totalDocCount}${label}`);
      displayNode.iconStyle = 'warning';
      displayParent.addNode(displayNode);
    }

    // get children
    // while True:
    //     next_field_index = fields.index(field) + 1
    //     if next_field_index >= len(fields):
    //         display_node.icon = 'file'
    //         display_node.icon_style = 'info'
    //         return doc_count
    //     next_field = fields[next_field_index]

    //     # TODO - add handling of creating * as next level of tree

    //     if len(df[next_field].value_counts().index) > 0:
    //         break
    //     else:
    //         field = next_field
    //         if collapse_redundant:
    //             # add dummy node label
    //             display_node.name += " '*'"
    //             label += " '*'"
    //         else:
    //             label += " '*'"
    //             next_display_node = ipytree.Node(f"{doc_count}/{total_doc_count}{label}")
    //             next_display_node.icon_style = 'warning'
    //             display_node.add_node(next_display_node)

    //             display_node = next_display_node
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

      // console.log(
      //   'filter',
      //   nextField,
      //   filteredItemSets.filter((is) => is.items[nextField] !== undefined).length
      // );

      if (filteredItemSets.filter((is) => is.items[nextField] !== undefined).length > 0) {
        break;
      } else {
        field = nextField;
        if (collapseRedundant) {
          // add dummy node label
          displayNode.name += ` '*'`;
          label += ` '*'`;
          const nextDisplayNode = NewNodeFactory(`${docCount}/${totalDocCount}${label}`);
          nextDisplayNode.iconStyle = 'warning';
          displayNode.addNode(nextDisplayNode);
          displayNode = nextDisplayNode;
        }
      }
    }

    // sub_count = 0
    // for next_value in df[next_field].value_counts().index:
    //     sub_count += ItemSetTree.df_depth_first_search(fields, display_node, doc_count, label, next_field,
    //                                                    next_value, df,
    //                                                    collapse_redundant,
    //                                                    display_other)
    let subCount = 0;
    for (const nextValue of iss.map((is) => is.items[nextField]).flat()) {
      subCount += dfDepthFirstSearch(
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

    // if display_other:
    // if sub_count < doc_count:
    //     display_node.add_node(
    //         ipytree.Node(f"{doc_count - sub_count}/{total_doc_count}{parent_label} '{value}' 'OTHER'"))
    if (displayOther) {
      if (subCount < docCount) {
        displayNode.addNode(
          NewNodeFactory(`${docCount - subCount}/${totalDocCount}${parentLabel} '{value}' 'OTHER`)
        );
      }
    }

    return docCount;
  }

  // Create simple tree consisting or non-overlapping sets of data.
  // By default (fields==None), the field search order is dependent on the highest count itemsets.
  function getSimpleHierarchicalTree(
    iss: ItemSet[],
    collapseRedundant: boolean,
    displayOther: boolean
  ) {
    //     if fields is None:
    //     fields = list()
    // for index, row in df.drop(['max_p_value', 'size', 'doc_count', 'total_doc_count'], axis=1).iterrows():
    //     candidates = list(row[row.notna()].index)
    //     for candidate in candidates:
    //         if candidate not in fields:
    //             fields.append(candidate)
    // field = fields[0]
    // total_doc_count = df['total_doc_count'].max()
    // root = ipytree.Tree()
    // for value in df[field].value_counts().index:
    //     ItemSetTree.df_depth_first_search(fields, root, total_doc_count+1, '', field, value, df,
    //                                       collapse_redundant,
    //                                       display_other)
    // return fields, root

    const field = fields[0];
    const totalDocCount = Math.max(...itemSets.map((is) => is.totalCount));

    const newRoot = NewNodeFactory('');

    for (const value of iss.map((is) => is.items[field]).flat()) {
      dfDepthFirstSearch(
        newRoot,
        totalDocCount + 1,
        '',
        field,
        value,
        iss,
        collapseRedundant,
        displayOther
      );
    }

    return newRoot;
  }

  buildTree();
  const simpleRoot = getSimpleHierarchicalTree(itemSets, true, false);
  // console.log('simpleRoot', simpleRoot);

  return {
    root,
    simpleRoot,
    minQualityRatio,
    parentQualityWeight,
    parentSimilarityWeight,
  };
}
