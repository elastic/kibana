/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagedUserDetailsRequestOptions } from '../../../../../../common/search_strategy/security_solution/users/managed_details';
import { buildManagedUserDetailsQuery } from './query.managed_user_details.dsl';

export const mockOptions: ManagedUserDetailsRequestOptions = {
  defaultIndex: ['logs-*'],
  userName: 'test-user-name',
};

describe('buildManagedUserDetailsQuery', () => {
  test('build query from options correctly', () => {
    expect(buildManagedUserDetailsQuery(mockOptions)).toMatchSnapshot();
  });
});
