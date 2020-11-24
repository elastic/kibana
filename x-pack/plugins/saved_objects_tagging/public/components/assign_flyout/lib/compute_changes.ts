/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AssignableObject } from '../../../../common/assignments';
import { AssignmentStatusMap, AssignmentOverrideMap } from '../types';
import { getAssignmentAction, getKey } from '../utils';

export const computeRequiredChanges = ({
  objects,
  initialStatus,
  overrides,
}: {
  objects: AssignableObject[];
  initialStatus: AssignmentStatusMap;
  overrides: AssignmentOverrideMap;
}) => {
  const assigned: AssignableObject[] = [];
  const unassigned: AssignableObject[] = [];

  objects.forEach((object) => {
    const key = getKey(object);
    const status = initialStatus[key];
    const override = overrides[key];

    const action = getAssignmentAction(status, override);
    if (action === 'added') {
      assigned.push(object);
    }
    if (action === 'removed') {
      unassigned.push(object);
    }
  });

  return {
    assigned,
    unassigned,
  };
};
