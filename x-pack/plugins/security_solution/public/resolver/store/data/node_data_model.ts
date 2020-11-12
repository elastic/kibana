/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IDToNodeEvents } from '../../types';

export function mergeMaps(first: IDToNodeEvents, second: IDToNodeEvents) {
  const mergedMaps: IDToNodeEvents = new Map();

  const addEntriesFromMap = (nodeData: IDToNodeEvents) => {
    for (const [id, events] of nodeData.entries()) {
      const mergedMapEvents = mergedMaps.get(id);
      if (!mergedMapEvents) {
        mergedMaps.set(id, [...events]);
      } else {
        events.push(...events);
      }
    }
  };

  addEntriesFromMap(first);
  addEntriesFromMap(second);

  return mergedMaps;
}
