/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AssignableObject } from '../../../common/assignments';
import { AssignmentOverride, AssignmentStatus, AssignmentAction } from './types';

// TODO: use from common/assignment instead
export const getKey = ({ id, type }: AssignableObject) => `${type}|${id}`;

export const parseKey = (key: string): { type: string; id: string } => {
  const parts = key.split('|');
  return {
    type: parts[0],
    id: parts[1],
  };
};

export const getOverriddenStatus = (
  initialStatus: AssignmentStatus,
  override: AssignmentOverride | undefined
): AssignmentStatus => {
  if (override) {
    return override === 'selected' ? 'full' : 'none';
  }
  return initialStatus;
};

export const getAssignmentAction = (
  initialStatus: AssignmentStatus,
  override: AssignmentOverride | undefined
): AssignmentAction => {
  const overriddenStatus = getOverriddenStatus(initialStatus, override);
  if (initialStatus !== overriddenStatus) {
    if (overriddenStatus === 'full') {
      return 'added';
    }
    if (overriddenStatus === 'none') {
      return 'removed';
    }
  }
  return 'unchanged';
};
