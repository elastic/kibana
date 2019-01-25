/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { arrayToMap } from './aeroelastic/functional';
import { getId } from './get_id';

export const cloneSubgraphs = nodes => {
  const idMap = arrayToMap(nodes.map(n => n.id));
  // We simultaneously provide unique id values for all elements (across all pages)
  // AND ensure that parent-child relationships are retained (via matching id values within page)
  Object.keys(idMap).forEach(key => (idMap[key] = getId(key.split('-')[0]))); // new group names to which we can map
  // must return elements in the same order, for several reasons
  const newNodes = nodes.map(element => ({
    ...element,
    id: idMap[element.id],
    position: {
      ...element.position,
      parent: element.position.parent ? idMap[element.position.parent] : null,
    },
  }));
  return newNodes;
};
