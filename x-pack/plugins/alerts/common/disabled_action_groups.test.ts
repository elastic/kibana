/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isActionGroupDisabledForActionTypeId } from './disabled_action_groups';
import { RecoveredActionGroup } from './builtin_action_groups';

test('returns false if action group id has no disabled types', () => {
  expect(isActionGroupDisabledForActionTypeId('enabledActionGroup', '.jira')).toBeFalsy();
});

test('returns false if action group id does not contains type', () => {
  expect(isActionGroupDisabledForActionTypeId(RecoveredActionGroup.id, '.email')).toBeFalsy();
});

test('returns true if action group id does contain type', () => {
  expect(isActionGroupDisabledForActionTypeId(RecoveredActionGroup.id, '.jira')).toBeTruthy();
});
