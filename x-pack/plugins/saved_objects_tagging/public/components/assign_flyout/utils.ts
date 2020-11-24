/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { sortBy } from 'lodash';
import { AssignableObject, getKey } from '../../../common/assignments';
import {
  AssignmentOverride,
  AssignmentStatus,
  AssignmentAction,
  AssignmentStatusMap,
} from './types';

export { getKey } from '../../../common/assignments';

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

const statusPriority: Record<AssignmentStatus, number> = {
  full: 1,
  partial: 2,
  none: 3,
};

export const sortByStatusAndTitle = (
  objects: AssignableObject[],
  statusMap: AssignmentStatusMap
) => {
  return sortBy<AssignableObject>(objects, [
    (obj) => `${statusPriority[statusMap[getKey(obj)]]}-${obj.title}`,
  ]);
};
