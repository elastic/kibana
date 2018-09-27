/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, sortBy, last } from 'lodash';

export function getAgentMarks(transaction) {
  const duration = transaction.transaction.duration.us;
  const threshold = (duration / 100) * 2;

  return sortBy(
    Object.entries(get(transaction, 'transaction.marks.agent', [])),
    '1'
  )
    .map(([name, ms]) => ({
      name,
      timeLabel: ms * 1000,
      timeAxis: ms * 1000
    }))
    .reduce((acc, curItem) => {
      const prevTime = get(last(acc), 'timeAxis');
      const nextValidTime = prevTime + threshold;
      const isTooClose = prevTime != null && nextValidTime > curItem.timeAxis;
      const canFit = nextValidTime <= duration;

      if (isTooClose && canFit) {
        acc.push({ ...curItem, timeAxis: nextValidTime });
      } else {
        acc.push(curItem);
      }
      return acc;
    }, [])
    .reduceRight((acc, curItem) => {
      const prevTime = get(last(acc), 'timeAxis');
      const nextValidTime = prevTime - threshold;
      const isTooClose = prevTime != null && nextValidTime < curItem.timeAxis;
      const canFit = nextValidTime >= 0;

      if (isTooClose && canFit) {
        acc.push({ ...curItem, timeAxis: nextValidTime });
      } else {
        acc.push(curItem);
      }
      return acc;
    }, [])
    .reverse();
}
