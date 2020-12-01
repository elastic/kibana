/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataTierAllocationType, AllocateAction, MigrateAction } from '../../../../common/types';

/**
 * Determine what deserialized state the policy config represents.
 *
 * See {@DataTierAllocationType} for more information.
 */
export const determineDataTierAllocationTypeLegacy = (
  actions: {
    allocate?: AllocateAction;
    migrate?: MigrateAction;
  } = {}
): DataTierAllocationType => {
  const { allocate, migrate } = actions;

  if (migrate?.enabled === false) {
    return 'none';
  }

  if (!allocate) {
    return 'default';
  }

  if (
    (allocate.require && Object.keys(allocate.require).length) ||
    (allocate.include && Object.keys(allocate.include).length) ||
    (allocate.exclude && Object.keys(allocate.exclude).length)
  ) {
    return 'custom';
  }

  return 'default';
};

export const determineDataTierAllocationType = (
  actions: {
    allocate?: AllocateAction;
    migrate?: MigrateAction;
  } = {}
) => {
  const { allocate, migrate } = actions;

  if (migrate?.enabled === false) {
    return 'none';
  }

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
