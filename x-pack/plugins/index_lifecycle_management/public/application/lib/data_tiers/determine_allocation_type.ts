/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AllocateAction } from '../../../../common/types';

export const determineDataTierAllocationType = (
  actions: {
    allocate?: AllocateAction;
  } = {}
) => {
  const { allocate } = actions;

  if (!allocate) {
    return 'node_roles';
  }

  if (
    (allocate.require && Object.keys(allocate.require).length) ||
    (allocate.include && Object.keys(allocate.include).length) ||
    (allocate.exclude && Object.keys(allocate.exclude).length)
  ) {
    return 'node_attrs';
  }

  return 'node_roles';
};
