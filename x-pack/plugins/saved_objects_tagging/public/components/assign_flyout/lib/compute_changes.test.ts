/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAssignableObject } from '../../../../common/test_utils';
import { getKey } from '../../../../common/assignments';
import { computeRequiredChanges } from './compute_changes';
import { AssignmentOverrideMap, AssignmentStatusMap } from '../types';

describe('computeRequiredChanges', () => {
  it('returns objects that need to be assigned', () => {
    const obj1 = createAssignableObject({ type: 'test', id: '1' });
    const obj2 = createAssignableObject({ type: 'test', id: '2' });
    const obj3 = createAssignableObject({ type: 'test', id: '3' });

    const initialStatus: AssignmentStatusMap = {
      [getKey(obj1)]: 'full',
      [getKey(obj2)]: 'partial',
      [getKey(obj3)]: 'none',
    };

    const overrides: AssignmentOverrideMap = {
      [getKey(obj1)]: 'selected',
      [getKey(obj2)]: 'selected',
      [getKey(obj3)]: 'selected',
    };

    const { assigned, unassigned } = computeRequiredChanges({
      objects: [obj1, obj2, obj3],
      initialStatus,
      overrides,
    });

    expect(assigned).toEqual([obj2, obj3]);
    expect(unassigned).toEqual([]);
  });

  it('returns objects that need to be unassigned', () => {
    const obj1 = createAssignableObject({ type: 'test', id: '1' });
    const obj2 = createAssignableObject({ type: 'test', id: '2' });
    const obj3 = createAssignableObject({ type: 'test', id: '3' });

    const initialStatus: AssignmentStatusMap = {
      [getKey(obj1)]: 'full',
      [getKey(obj2)]: 'partial',
      [getKey(obj3)]: 'none',
    };

    const overrides: AssignmentOverrideMap = {
      [getKey(obj1)]: 'deselected',
      [getKey(obj2)]: 'deselected',
      [getKey(obj3)]: 'deselected',
    };

    const { assigned, unassigned } = computeRequiredChanges({
      objects: [obj1, obj2, obj3],
      initialStatus,
      overrides,
    });

    expect(assigned).toEqual([]);
    expect(unassigned).toEqual([obj1, obj2]);
  });

  it('does not include objects that do not have specified override', () => {
    const obj1 = createAssignableObject({ type: 'test', id: '1' });
    const obj2 = createAssignableObject({ type: 'test', id: '2' });
    const obj3 = createAssignableObject({ type: 'test', id: '3' });

    const initialStatus: AssignmentStatusMap = {
      [getKey(obj1)]: 'full',
      [getKey(obj2)]: 'partial',
      [getKey(obj3)]: 'none',
    };

    const overrides: AssignmentOverrideMap = {};

    const { assigned, unassigned } = computeRequiredChanges({
      objects: [obj1, obj2, obj3],
      initialStatus,
      overrides,
    });

    expect(assigned).toEqual([]);
    expect(unassigned).toEqual([]);
  });
});
