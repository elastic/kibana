/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Node } from '../types';

function getChain(a: Record<string, Node>, startAt: string): Node[] {
  const nodes: Node[] = [];

  nodes.push(a[startAt]);

  const compareAgainst = Object.values(a);
  let previousId = startAt;
  compareAgainst.forEach(n => {
    if (n.inputNodeIds.includes(previousId)) {
      if (n.inputNodeIds.length === 1) {
        nodes.push(n);
        previousId = n.id;
      }
    }
  });

  return nodes;
}

export function getChainInformation(
  a: Record<string, Node>
): {
  startChains: Node[][];
  otherChains: Node[][];
} {
  const copy = { ...a };

  const entries = Object.entries(copy);

  const startEntries = entries.filter(([id, node]) => node.inputNodeIds.length === 0);

  const startChains = startEntries.map(([i]) => {
    const chain = getChain(copy, i);
    chain.forEach(({ id }) => {
      delete copy[id];
    });
    return chain;
  });
  const lastChainIds = startChains.map(c => c[c.length - 1].id);
  const otherChains = Object.entries(copy)
    .filter(([id, n]) => lastChainIds.some(i => n.inputNodeIds.includes(i)))
    .map(([id, n]) => getChain(copy, id));
  return {
    startChains,
    otherChains,
  };
}
