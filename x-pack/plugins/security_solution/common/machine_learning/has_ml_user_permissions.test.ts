/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';
import { hasMlUserPermissions } from './has_ml_user_permissions';
import { emptyMlCapabilities } from './empty_ml_capabilities';

describe('has_ml_user_permissions', () => {
  let mlCapabilities = cloneDeep(emptyMlCapabilities);

  beforeEach(() => {
    mlCapabilities = cloneDeep(emptyMlCapabilities);
  });

  test('it returns false when everything is false', () => {
    const permissions = hasMlUserPermissions(mlCapabilities);
    expect(permissions).toEqual(false);
  });

  test('it returns true when all the correct boolean switches are flipped', () => {
    mlCapabilities.capabilities.canGetDatafeeds = true;
    mlCapabilities.capabilities.canGetJobs = true;
    mlCapabilities.capabilities.canGetCalendars = true;
    const permissions = hasMlUserPermissions(mlCapabilities);
    expect(permissions).toEqual(true);
  });
});
