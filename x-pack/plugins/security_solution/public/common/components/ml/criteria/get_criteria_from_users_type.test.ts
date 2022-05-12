/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsersType } from '../../../../users/store/model';
import { getCriteriaFromUsersType } from './get_criteria_from_users_type';

describe('get_criteria_from_user_type', () => {
  test('returns user name from criteria if the user type is details', () => {
    const criteria = getCriteriaFromUsersType(UsersType.details, 'admin');
    expect(criteria).toEqual([{ fieldName: 'user.name', fieldValue: 'admin' }]);
  });

  test('returns empty array from criteria if the user type is page but rather an empty array', () => {
    const criteria = getCriteriaFromUsersType(UsersType.page, 'admin');
    expect(criteria).toEqual([]);
  });

  test('returns empty array from criteria if the user name is undefined and user type is details', () => {
    const criteria = getCriteriaFromUsersType(UsersType.details, undefined);
    expect(criteria).toEqual([]);
  });
});
