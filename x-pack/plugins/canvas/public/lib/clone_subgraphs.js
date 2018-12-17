/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { arrayToMap } from './aeroelastic/functional';
import { getId } from './get_id';

const getParent = element => element.position.parent;

export const cloneSubgraphs = nodes => {
  const groupIdMap = arrayToMap(nodes.filter(getParent).map(getParent));
  const postfix = getId(''); // will just return a '-e5983ef1-9c7d-4b87-b70a-f34ea199e50c' or so
  // remove the possibly preexisting postfix (otherwise it can keep growing...), then append the new postfix
  const uniquify = id => (groupIdMap[id] ? id.split('-')[0] + postfix : getId('element'));
  // We simultaneously provide unique id values for all elements (across all pages)
  // AND ensure that parent-child relationships are retained (via matching id values within page)
  const newNodes = nodes.map(element => ({
    ...element,
    id: uniquify(element.id),
    position: { ...element.position, parent: getParent(element) && uniquify(getParent(element)) },
  }));
  return newNodes;
};
