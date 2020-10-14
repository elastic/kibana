/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { breadthFirst, levelOrder } from '../../lib/tree_sequencers';

export class IndexedTree {
  /**
   * Construct an indexed tree from a collection.
   * Each item is passed to `edges` which must return edges inferred from the item.
   * An edge is described using a tuple. The edge points from the first element of the tuple to the second.
   *
   * If the graph doesn't form a tree, `null` is returned.
   * This can happen in a few ways:
   * * there isn't a single root
   * * other than the root, nodes all have one parent
   * * starting from the root, we must be able to visit all children
   */
  public static fromIterable<T>(
    iterable: Iterable<T>,
    /* Given a `t`, return any nodes inferred from it. */
    nodes: (t: T) => Iterable<string>,
    /* Given a `t`, return edges inferred from it. Edges are directed. */
    edges: (t: T) => Iterable<[from: string, to: string]>
  ): IndexedTree | null {
    const nodeSet: Set<string> = new Set();
    /** Node -> parent */
    const childToParent = new Map();
    /** Node -> children */
    const parentToChildren: Map<string, Set<string>> = new Map();
    for (const item of iterable) {
      for (const [parent, child] of edges(item)) {
        const existingParent = childToParent.get(child);
        if (existingParent !== undefined && existingParent !== parent) {
          // `child` has at least two different parent, therefore this is not a tree.
          // TODO, test that giving a node two parents results in null
          return null;
        }
        childToParent.set(child, parent);
        addToMapOfSets(parentToChildren, parent, child);
        // infer nodes from edges
        nodeSet.add(parent);
        nodeSet.add(child);
      }
      for (const node of nodes(item)) {
        // infer nodes directly from items
        nodeSet.add(node);
      }
    }
    // find the root, and assert that there is only one root
    let rootCandidate: undefined | string;
    for (const node of nodeSet) {
      // the root is the one-and-only node that has no parent
      if (childToParent.has(node) === false) {
        if (rootCandidate === undefined) {
          // we found a possible root
          rootCandidate = node;
        } else {
          // `node` is the second node with no parent. this is not a tree.
          return null;
        }
      }
    }

    const root: string = rootCandidate!;

    // assert that the tree is connected from the root
    // clone the nodeSet and use it to keep track of unvisited nodes
    const unvisited = new Set(nodeSet);
    for (const node of breadthFirst(root, (vertex) => {
      const children = parentToChildren.get(vertex);
      if (children) {
        return children.values();
      } else {
        return [];
      }
    })) {
      unvisited.delete(node);
    }

    // TODO, return null if this isn't a tree? or is that a responsibility of the constructor?
    return new IndexedTree(nodeSet, childToParent, parentToChildren);
  }

  constructor(
    private readonly nodes: ReadonlySet<string>,
    private readonly childToParent: ReadonlyMap<string, string>,
    private readonly parentToChildren: ReadonlyMap<string, ReadonlySet<string>>
  ) {}

  /**
   * children of `node`.
   */
  public children(node: string): Iterable<string> {
    return this.parentToChildren.get(node)?.values() ?? [];
  }

  /**
   * parent of `node` if any, or undefined if `node` is the root.
   */
  public parent(node: string): string | undefined {
    return this.childToParent.get(node);
  }

  /**
   * The count of nodes in the tree.
   */
  public get size(): number {
    return this.nodes.size;
  }

  /**
   * The root node.
   */
  public get root(): string {
    // get an arbitrary node. Any will do.
    const current: string = this.nodes.values().next().value;
    let parent: string | undefined;

    do {
      parent = this.parent(current);
    } while (parent !== undefined);
    return current;
  }

  /**
   * the nodes, in level order.
   */
  public get levelOrder(): Iterable<string> {
    return levelOrder(this.root, this.children.bind(this));
  }
}

/**
 * Use this map each key to multiple values by lazily instantiating a Set for each key.
 */
function addToMapOfSets<K, V>(mapOfSets: Map<K, Set<V>>, key: K, value: V) {
  const values = mapOfSets.get(key);
  if (values) {
    values.add(value);
  } else {
    const newValues: Set<V> = new Set();
    newValues.add(value);
    mapOfSets.set(key, newValues);
  }
}
