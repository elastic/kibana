/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function calculateClass(item, initial) {
  const classes = [item.type];
  if (initial) {
    classes.push(initial);
  }
  if (item.type === 'shard') {
    classes.push('monShard');
    classes.push((item.primary && 'primary') || 'replica');
    classes.push(item.state.toLowerCase());
    if (item.state === 'UNASSIGNED' && item.primary) {
      classes.push('emergency');
    }
  }
  if (item.master) {
    classes.push('master');
  }
  return classes.join(' ');
}
