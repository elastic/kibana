/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from '@elastic/safer-lodash-set';
import _ from 'lodash';

function addOne(obj, key) {
  let value = _.get(obj, key);
  set(obj, key, ++value);
}

export function calculateShardStats(state) {
  const data = { totals: { primary: 0, replica: 0, unassigned: { replica: 0, primary: 0 } } };
  const processShards = function (shard) {
    const metrics = data[shard.index] || {
      status: 'green',
      primary: 0,
      replica: 0,
      unassigned: { replica: 0, primary: 0 },
    };
    let key = '';
    if (shard.state !== 'STARTED') {
      key = 'unassigned.';
      if (metrics.status !== 'red') {
        metrics.status = shard.primary && shard.state === 'UNASSIGNED' ? 'red' : 'yellow';
      }
    }
    key += shard.primary ? 'primary' : 'replica';
    addOne(metrics, key);
    addOne(data.totals, key);
    data[shard.index] = metrics;
  };
  if (state) {
    const shards = _.get(state, 'cluster_state.shards');
    _.each(shards, processShards);
  }
  return data;
}
