/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { decorateShards } from './decorate_shards';

const nodes = {
  '8WuXSoE6Q_-etoIhx0R3ag': {
    attributes: {},
    indexCount: 8,
    name: 'node01',
    node_ids: ['8WuXSoE6Q_-etoIhx0R3ag'],
    shardCount: 10,
    transport_address: '127.0.0.1:9300',
    type: 'master',
  },
  'ZRnQRUBBQHugqD-rqicFJw': {
    attributes: {},
    indexCount: 7,
    name: 'node02',
    node_ids: ['ZRnQRUBBQHugqD-rqicFJw'],
    shardCount: 8,
    transport_address: '127.0.0.1:9301',
    type: 'node',
  },
};

describe('decorateShards', () => {
  it('relocating shard', () => {
    const shard = {
      index: 'test',
      node: '8WuXSoE6Q_-etoIhx0R3ag',
      primary: true,
      relocating_node: 'ZRnQRUBBQHugqD-rqicFJw',
      shard: 0,
      state: 'RELOCATING',
    };
    const result = decorateShards([shard], nodes);
    expect(result[0]).toMatchObject({
      index: 'test',
      node: '8WuXSoE6Q_-etoIhx0R3ag',
      nodeName: 'node01',
      primary: true,
      relocating_node: 'ZRnQRUBBQHugqD-rqicFJw',
      shard: 0,
      state: 'RELOCATING',
      tooltip_message: 'Relocating to node02',
      type: 'shard',
    });
  });

  it('relocating shard where destination node is unknown', () => {
    const shard = {
      index: 'test',
      node: '8WuXSoE6Q_-etoIhx0R3ag',
      primary: true,
      relocating_node: 'ZRnQRUBBQHugqD-rqicFJw',
      shard: 0,
      state: 'RELOCATING',
    };
    // pass nodes object with only node01 value
    const result = decorateShards([shard], {
      '8WuXSoE6Q_-etoIhx0R3ag': nodes['8WuXSoE6Q_-etoIhx0R3ag'],
    });
    expect(result[0]).toMatchObject({
      index: 'test',
      node: '8WuXSoE6Q_-etoIhx0R3ag',
      nodeName: 'node01',
      primary: true,
      relocating_node: 'ZRnQRUBBQHugqD-rqicFJw',
      shard: 0,
      state: 'RELOCATING',
      tooltip_message: 'Relocating',
      type: 'shard',
    });
  });

  it('started shard', () => {
    const shard = {
      index: 'test2',
      node: 'ZRnQRUBBQHugqD-rqicFJw',
      primary: true,
      relocating_node: null,
      shard: 3,
      state: 'STARTED',
    };
    const result = decorateShards([shard], nodes);
    expect(result[0]).toMatchObject({
      index: 'test2',
      node: 'ZRnQRUBBQHugqD-rqicFJw',
      nodeName: 'node02',
      primary: true,
      relocating_node: null,
      shard: 3,
      state: 'STARTED',
      tooltip_message: 'Started',
      type: 'shard',
    });
  });

  it('initializing shard', () => {
    const shard = {
      index: 'test2',
      node: '8WuXSoE6Q_-etoIhx0R3ag',
      primary: false,
      relocating_node: null,
      shard: 3,
      state: 'INITIALIZING',
    };
    const result = decorateShards([shard], nodes);
    expect(result[0]).toMatchObject({
      index: 'test2',
      node: '8WuXSoE6Q_-etoIhx0R3ag',
      nodeName: 'node01',
      primary: false,
      relocating_node: null,
      shard: 3,
      state: 'INITIALIZING',
      tooltip_message: 'Initializing',
      type: 'shard',
    });
  });

  it('unassigned shard', () => {
    const shard = {
      index: 'test2',
      node: null,
      primary: false,
      relocating_node: null,
      shard: 4,
      state: 'UNASSIGNED',
    };
    const result = decorateShards([shard], nodes);
    expect(result[0]).toMatchObject({
      index: 'test2',
      node: null,
      nodeName: null,
      primary: false,
      relocating_node: null,
      shard: 4,
      state: 'UNASSIGNED',
      tooltip_message: 'Unassigned',
      type: 'shard',
    });
  });
});
