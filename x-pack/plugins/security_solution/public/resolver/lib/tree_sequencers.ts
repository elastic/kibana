/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Sequences a tree, yielding children returned by the `children` function. Sequencing is done in 'level order' fashion.
 */
export function* levelOrder<T>(root: T, children: (parent: T) => T[]): Iterable<T> {
  let level = [root];
  while (level.length !== 0) {
    let nextLevel = [];
    for (const node of level) {
      yield node;
      nextLevel.push(...(children(node) || []));
    }
    level = nextLevel;
    nextLevel = [];
  }
}

/**
 * Calculates the generations and descendants in a resolver graph starting from a specific node in the graph.
 *
 * @param node the ResolverNode to start traversing the tree from
 * @param currentLevel the level within the tree, the caller should pass in 0 to calculate the descendants from the
 * passed in node
 * @param totalDescendants the accumulated descendants while traversing the tree
 * @param children a function for retrieving the direct children of a node
 */
export function calculateGenerationsAndDescendants<T>({
  node,
  currentLevel,
  totalDescendants,
  children,
}: {
  node: T;
  currentLevel: number;
  totalDescendants: number;
  children: (parent: T) => T[];
}): { generations: number; descendants: number } {
  const childrenArray = children(node);
  // we reached a node that does not have any children so return
  if (childrenArray.length <= 0) {
    return { generations: currentLevel, descendants: totalDescendants };
  }

  let greatestLevel = 0;
  let sumDescendants = totalDescendants;
  for (const child of childrenArray) {
    const { generations, descendants } = calculateGenerationsAndDescendants({
      node: child,
      currentLevel: currentLevel + 1,
      totalDescendants: sumDescendants + 1,
      children,
    });
    sumDescendants = descendants;
    greatestLevel = Math.max(greatestLevel, generations);
  }
  return { generations: greatestLevel, descendants: sumDescendants };
}
