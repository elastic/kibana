/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { find, some, reduce, values, sortBy, get } from 'lodash';
import { hasPrimaryChildren } from '../lib/has_primary_children';
import { decorateShards } from '../lib/decorate_shards';

export function nodesByIndices() {
  return function nodesByIndicesFn(shards, nodes) {
    const getNodeType = function (node) {
      const attrs = node.attributes || {};
      return attrs.master === 'true' ? 'master' : 'normal';
    };

    // NOTE: this seems to be used, but has no discernible effect in the UI
    function createNode(obj, node, id) {
      node.type = 'node';
      node.children = [];
      const nodeType = getNodeType(node);
      if (nodeType === 'normal' || nodeType === 'data') {
        obj[id] = node;
      }
      return obj;
    }

    function createIndexAddShard(obj, shard) {
      const node = get(shard, 'node.name', shard.node || 'unassigned');
      const index = get(shard, 'index.name', shard.index);
      if (!obj[node]) {
        createNode(obj, nodes[node], node);
      }
      let indexObj = find(obj[node].children, { id: index });
      if (!indexObj) {
        indexObj = {
          id: index,
          name: index,
          type: 'index',
          children: [],
        };
        obj[node].children.push(indexObj);
      }
      indexObj.children.push(shard);
      return obj;
    }

    function isUnassigned(shard) {
      return shard.state === 'UNASSIGNED';
    }

    let data = {};
    if (some(shards, isUnassigned)) {
      data.unassigned = {
        name: 'Unassigned',
        master: false,
        type: 'node',
        children: [],
      };
    }

    data = reduce(decorateShards(shards, nodes), createIndexAddShard, data);
    const dataValues = values(data);
    return sortBy(dataValues, function (node) {
      return [node.name !== 'Unassigned', !node.master, node.name];
    }).map(function (node) {
      if (node.name === 'Unassigned') {
        node.unassignedPrimaries = node.children.some(hasPrimaryChildren);
      }
      return node;
    });
  };
}
