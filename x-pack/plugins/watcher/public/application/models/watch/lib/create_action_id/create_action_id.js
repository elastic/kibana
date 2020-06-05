/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function createActionId(actions, type) {
  const existingIds = actions.map((action) => action.id);

  let nextValidIncrement = 1;
  let nextValidId = undefined;
  while (nextValidId === undefined) {
    const proposedId = `${type}_${nextValidIncrement}`;
    if (!existingIds.includes(proposedId)) {
      nextValidId = proposedId;
    } else {
      nextValidIncrement++;
    }
  }

  return nextValidId;
}
