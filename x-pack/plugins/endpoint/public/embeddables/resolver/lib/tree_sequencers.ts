/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function* depthFirstPreorder<T>(root: T, children: (parent: T) => T[]): Iterable<T> {
  const nodesToVisit = [root];
  while (nodesToVisit.length !== 0) {
    const currentNode = nodesToVisit.shift();
    if (currentNode !== undefined) {
      nodesToVisit.unshift(...(children(currentNode) || []));
      yield currentNode;
    }
  }
}

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
