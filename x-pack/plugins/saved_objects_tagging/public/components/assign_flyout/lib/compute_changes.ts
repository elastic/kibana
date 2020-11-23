/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AssignableObject } from '../../../../common/types';
import { AssignmentStatusMap, AssignmentOverrideMap } from '../types';
import { getOverriddenStatus, getKey } from '../utils';

export const computeRequiredChanges = ({
  objects,
  initialStatus,
  overrides,
}: {
  objects: AssignableObject[];
  initialStatus: AssignmentStatusMap;
  overrides: AssignmentOverrideMap;
}) => {
  const toAssign: AssignableObject[] = [];
  const toUnassign: AssignableObject[] = [];

  objects.forEach((object) => {
    const key = getKey(object);
    const status = initialStatus[key];
    const override = overrides[key];

    const overriddenStatus = getOverriddenStatus(status, override);

    if (status !== overriddenStatus) {
      if (overriddenStatus === 'full') {
        toAssign.push(object);
      }
      if (overriddenStatus === 'none') {
        toUnassign.push(object);
      }
    }
  });

  return {
    toAssign,
    toUnassign,
  };
};
