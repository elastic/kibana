/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getCriteriaFromHostType } from './get_criteria_from_host_type';
import { HostsType } from '../../../../hosts/store/model';

describe('get_criteria_from_host_type', () => {
  test('returns host names from criteria if the host type is details', () => {
    const criteria = getCriteriaFromHostType(HostsType.details, 'zeek-iowa');
    expect(criteria).toEqual([{ fieldName: 'host.name', fieldValue: 'zeek-iowa' }]);
  });

  test('returns empty array from criteria if the host type is page but rather an empty array', () => {
    const criteria = getCriteriaFromHostType(HostsType.page, 'zeek-iowa');
    expect(criteria).toEqual([]);
  });

  test('returns empty array from criteria if the host name is undefined and host type is details', () => {
    const criteria = getCriteriaFromHostType(HostsType.details, undefined);
    expect(criteria).toEqual([]);
  });
});
