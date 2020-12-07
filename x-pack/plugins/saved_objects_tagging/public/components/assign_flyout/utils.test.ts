/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAssignableObject } from '../../../common/test_utils';
import { sortByStatusAndTitle, getAssignmentAction, getOverriddenStatus, getKey } from './utils';
import { AssignmentStatusMap } from './types';

describe('getOverriddenStatus', () => {
  it('returns the initial status if no override is defined', () => {
    expect(getOverriddenStatus('none', undefined)).toEqual('none');
    expect(getOverriddenStatus('partial', undefined)).toEqual('partial');
    expect(getOverriddenStatus('full', undefined)).toEqual('full');
  });

  it('returns the status associated with the override', () => {
    expect(getOverriddenStatus('none', 'selected')).toEqual('full');
    expect(getOverriddenStatus('partial', 'deselected')).toEqual('none');
  });
});

describe('getAssignmentAction', () => {
  it('returns the action that was performed on the object', () => {
    expect(getAssignmentAction('none', 'selected')).toEqual('added');
    expect(getAssignmentAction('partial', 'deselected')).toEqual('removed');
  });

  it('returns `unchanged` when the override matches the initial status', () => {
    expect(getAssignmentAction('none', 'deselected')).toEqual('unchanged');
    expect(getAssignmentAction('full', 'selected')).toEqual('unchanged');
  });

  it('returns `unchanged` when no override was applied', () => {
    expect(getAssignmentAction('none', undefined)).toEqual('unchanged');
    expect(getAssignmentAction('partial', undefined)).toEqual('unchanged');
    expect(getAssignmentAction('full', undefined)).toEqual('unchanged');
  });
});

describe('sortByStatusAndTitle', () => {
  it('sort objects by assignment status', () => {
    const obj1 = createAssignableObject({ type: 'test', id: '1', title: 'aaa' });
    const obj2 = createAssignableObject({ type: 'test', id: '2', title: 'bbb' });
    const obj3 = createAssignableObject({ type: 'test', id: '3', title: 'ccc' });

    const statusMap: AssignmentStatusMap = {
      [getKey(obj1)]: 'none',
      [getKey(obj2)]: 'full',
      [getKey(obj3)]: 'partial',
    };

    expect(sortByStatusAndTitle([obj1, obj2, obj3], statusMap)).toEqual([obj2, obj3, obj1]);
  });

  it('sort by title when objects have the same status', () => {
    const obj1 = createAssignableObject({ type: 'test', id: '1', title: 'bbb' });
    const obj2 = createAssignableObject({ type: 'test', id: '2', title: 'ccc' });
    const obj3 = createAssignableObject({ type: 'test', id: '3', title: 'aaa' });

    const statusMap: AssignmentStatusMap = {
      [getKey(obj1)]: 'full',
      [getKey(obj2)]: 'full',
      [getKey(obj3)]: 'full',
    };

    expect(sortByStatusAndTitle([obj1, obj2, obj3], statusMap)).toEqual([obj3, obj1, obj2]);
  });
});
