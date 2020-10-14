/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * Sequences a tree, yielding children returned by the `children` function. Sequencing is done in 'level order' fashion.
 */
export function* levelOrder<T>(root: T, children: (parent: T) => Iterable<T>): Iterable<T> {
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
 * Yield all vertices that are traversible from `root`.
 */
export function* breadthFirst<T>(
  root: T,
  /** Must return children reachable from `parent`. */ children: (parent: T) => Iterable<T>
): Iterable<T> {
  const discovered: Set<T> = new Set();
  const queue = [];
  discovered.add(root);
  queue.unshift(root);
  while (queue.length) {
    const vertex: T = queue.shift()!;
    yield vertex;
    for (const child of children(vertex)) {
      if (!discovered.has(child)) {
        discovered.add(child);
        queue.unshift(child);
      }
    }
  }
}
