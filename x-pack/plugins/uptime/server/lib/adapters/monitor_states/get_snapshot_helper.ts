/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { MonitorGroups, MonitorGroupIterator } from './search';
import { Snapshot } from '../../../../../../legacy/plugins/uptime/common/runtime_types';

const reduceItemsToCounts = (items: MonitorGroups[]) => {
  let down = 0;
  let up = 0;
  items.forEach(item => {
    if (item.groups.some(group => group.status === 'down')) {
      down++;
    } else {
      up++;
    }
  });
  return {
    down,
    mixed: 0,
    total: down + up,
    up,
  };
};

export const getSnapshotCountHelper = async (iterator: MonitorGroupIterator): Promise<Snapshot> => {
  const items: MonitorGroups[] = [];
  let res: MonitorGroups | null;
  // query the index to find the most recent check group for each monitor/location
  do {
    res = await iterator.next();
    if (res) {
      items.push(res);
    }
  } while (res !== null);

  return reduceItemsToCounts(items);
};
