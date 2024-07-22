/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { difference, union } from 'lodash';

export const mergeDedupedArrays = <T>(
  dedupedBaseVersion: T[],
  dedupedCurrentVersion: T[],
  dedupedTargetVersion: T[]
) => {
  const addedCurrent = difference(dedupedCurrentVersion, dedupedBaseVersion);
  const removedCurrent = difference(dedupedBaseVersion, dedupedCurrentVersion);

  const addedTarget = difference(dedupedTargetVersion, dedupedBaseVersion);
  const removedTarget = difference(dedupedBaseVersion, dedupedTargetVersion);

  const bothAdded = union(addedCurrent, addedTarget);
  const bothRemoved = union(removedCurrent, removedTarget);

  return difference(union(dedupedBaseVersion, bothAdded), bothRemoved);
};
