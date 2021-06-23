/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';

export function calculateClass(item, initial) {
  const classes = [item.type];
  if (initial) {
    classes.push(initial);
  }
  if (item.type === 'shard') {
    classes.push('monShard');
    if (get(item, 'shard.primary', item.primary)) {
      classes.push('primary');
    } else {
      classes.push('replica');
    }
    classes.push(get(item, 'shard.state', item.state).toLowerCase());
    if (
      get(item, 'shard.state', item.state) === 'UNASSIGNED' &&
      get(item, 'shard.primary', item.primary)
    ) {
      classes.push('emergency');
    }
  }
  if (item.master) {
    classes.push('master');
  }
  return classes.join(' ');
}
