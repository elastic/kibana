/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleDefaultAction, RuleSystemAction, RuleActionTypes } from '@kbn/alerting-plugin/common';
import { isSystemAction } from './is_system_action';

describe('isSystemAction', () => {
  const defaultAction: RuleDefaultAction = {
    actionTypeId: '.test',
    uuid: '111',
    group: 'default',
    id: '1',
    params: {},
  };

  const systemAction: RuleSystemAction = {
    id: '1',
    uuid: '123',
    params: { 'not-exist': 'test' },
    actionTypeId: '.test',
    type: RuleActionTypes.SYSTEM,
  };

  it('returns true if it is a system action', () => {
    expect(isSystemAction(systemAction)).toBe(true);
  });

  it('returns false if it is not a system action', () => {
    expect(isSystemAction(defaultAction)).toBe(false);
  });
});
