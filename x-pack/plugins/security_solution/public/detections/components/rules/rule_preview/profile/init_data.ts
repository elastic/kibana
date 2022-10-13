/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { flow } from 'fp-ts/lib/function';
import { calcTimes, sortIndices } from './unsafe_utils';
import type { Index, Shard, ShardSerialized } from './types';

export type IndexMap = Record<string, Index>;

export function mutateSearchTimesTree(shard: Shard) {
  if (shard.searches == null) {
    shard.time = 0;
  }

  let shardTime = 0;
  for (const search of shard.searches) {
    const totalTime = calcTimes(search.query);
    shardTime += totalTime;
    search.treeRoot = search.query[0];
  }
  shard.time = shardTime;
}

const initShards = (data: ShardSerialized[]) =>
  data.map((s) => {
    const idMatch = s.id.match(/\[([^\]\[]*?)\]/g) || [];
    const ids = idMatch.map((id) => {
      return id.replace('[', '').replace(']', '');
    });
    return {
      ...s,
      id: ids,
      time: 0,
      color: '',
      relative: 0,
    };
  });

export const calculateShardValues = () => (data: Shard[]) => {
  for (const shard of data) {
    mutateSearchTimesTree(shard);
  }

  return data;
};

export const initIndices = (data: Shard[]) => {
  const indices: IndexMap = {};

  for (const shard of data) {
    if (!indices[shard.id[1]]) {
      indices[shard.id[1]] = {
        time: 0,
        name: shard.id[1],
      };
    }
    // indices[shard.id[1]].shards.push(shard);
    indices[shard.id[1]].time += shard.time;
  }

  return indices;
};

export const initDataFor = () =>
  flow(cloneDeep as any, initShards, calculateShardValues(), initIndices, sortIndices);
