/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataTierAllocationType, AllocateAction } from './types';

export const determineDataTierAllocationType = (
  allocateAction?: AllocateAction
): DataTierAllocationType => {
  if (!allocateAction) {
    return 'default';
  }

  if (allocateAction.migrate?.enabled === false) {
    return 'none';
  }

  if (
    (allocateAction.require && Object.keys(allocateAction.require).length) ||
    (allocateAction.include && Object.keys(allocateAction.include).length) ||
    (allocateAction.exclude && Object.keys(allocateAction.exclude).length)
  ) {
    return 'custom';
  }

  return 'default';
};
