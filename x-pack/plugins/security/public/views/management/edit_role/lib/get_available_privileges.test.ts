/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaPrivilege } from '../../../../../common/model/kibana_privilege';
import { NO_PRIVILEGE_VALUE } from './constants';
import { getAvailablePrivileges } from './get_available_privileges';

describe('getAvailablePrivileges', () => {
  it('throws when given an unexpected minimum privilege', () => {
    expect(() => getAvailablePrivileges('idk' as KibanaPrivilege)).toThrowErrorMatchingSnapshot();
  });

  it(`returns all privileges when the minimum privilege is none`, () => {
    expect(getAvailablePrivileges(NO_PRIVILEGE_VALUE)).toEqual(['read', 'all']);
  });

  it(`returns all privileges when the minimum privilege is read`, () => {
    expect(getAvailablePrivileges('read')).toEqual(['read', 'all']);
  });

  it(`returns just the "all" privilege when the minimum privilege is all`, () => {
    expect(getAvailablePrivileges('all')).toEqual(['all']);
  });
});
