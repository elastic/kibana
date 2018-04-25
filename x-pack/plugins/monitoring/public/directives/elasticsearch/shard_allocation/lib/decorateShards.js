/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import { capitalize, find, get, includes } from 'lodash';

export function decorateShards(shards, nodes) {
  function getTooltipMessage(shard) {
    const isRelocating = (node) => includes(node.node_ids, shard.relocating_node);
    const nodeName = get(find(nodes, (n) => isRelocating(n)), 'name');

    // messages for relocating node
    if (nodeName) {
      if (shard.state === 'INITIALIZING') {
        return `Relocating from ${nodeName}`;
      }
      if (shard.state === 'RELOCATING') {
        return `Relocating to ${nodeName}`;
      }
    }
    return capitalize(shard.state.toLowerCase());
  }

  return shards.map((shard) => {
    const node = nodes[shard.resolver];
    shard.nodeName = (node && node.name) || null;
    shard.type = 'shard';
    shard.tooltip_message = getTooltipMessage(shard);
    return shard;
  });
}
