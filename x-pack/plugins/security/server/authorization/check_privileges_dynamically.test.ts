/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkPrivilegesDynamicallyWithRequestFactory } from './check_privileges_dynamically';

import { httpServerMock } from '../../../../../src/core/server/mocks';

test(`checkPrivileges.atSpace when spaces is enabled`, async () => {
  const expectedResult = Symbol();
  const spaceId = 'foo-space';
  const mockCheckPrivileges = {
    atSpace: jest.fn().mockReturnValue(expectedResult),
  };
  const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
  const request = httpServerMock.createKibanaRequest();
  const privilegeOrPrivileges = ['foo', 'bar'];
  const checkPrivilegesDynamically = checkPrivilegesDynamicallyWithRequestFactory(
    mockCheckPrivilegesWithRequest,
    () => ({
      getSpaceId: jest.fn().mockReturnValue(spaceId),
      namespaceToSpaceId: jest.fn(),
    })
  )(request);
  const result = await checkPrivilegesDynamically(privilegeOrPrivileges);

  expect(result).toBe(expectedResult);
  expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
  expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, privilegeOrPrivileges);
});

test(`checkPrivileges.globally when spaces is disabled`, async () => {
  const expectedResult = Symbol();
  const mockCheckPrivileges = {
    globally: jest.fn().mockReturnValue(expectedResult),
  };
  const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
  const request = httpServerMock.createKibanaRequest();
  const privilegeOrPrivileges = ['foo', 'bar'];
  const checkPrivilegesDynamically = checkPrivilegesDynamicallyWithRequestFactory(
    mockCheckPrivilegesWithRequest,
    () => undefined
  )(request);
  const result = await checkPrivilegesDynamically(privilegeOrPrivileges);

  expect(result).toBe(expectedResult);
  expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
  expect(mockCheckPrivileges.globally).toHaveBeenCalledWith(privilegeOrPrivileges);
});
