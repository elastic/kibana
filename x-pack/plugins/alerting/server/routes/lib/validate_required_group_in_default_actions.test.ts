/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateRequiredGroupInDefaultActions } from './validate_required_group_in_default_actions';

describe('validateRequiredGroupInDefaultActions', () => {
  const isSystemAction = jest.fn().mockImplementation((id) => id === 'system_action-id');

  it('throws an error if the action is missing the group', () => {
    expect(() =>
      validateRequiredGroupInDefaultActions([{ id: 'test' }], isSystemAction)
    ).toThrowErrorMatchingInlineSnapshot(`"Group is not defined in action test"`);
  });

  it('does not throw an error if the action has the group', () => {
    expect(() =>
      validateRequiredGroupInDefaultActions([{ id: 'test', group: 'default' }], isSystemAction)
    ).not.toThrow();
  });

  it('does not throw an error if the action is a system action and is missing the group', () => {
    expect(() =>
      validateRequiredGroupInDefaultActions([{ id: 'system_action-id' }], isSystemAction)
    ).not.toThrow();
  });
});
