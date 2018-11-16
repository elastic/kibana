/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkPrivilegesDynamicallyWithRequestFactory } from './check_privileges_dynamically';

const createMockCheckPrivileges = () => {
  return {
    atSpace: jest.fn(),
    globally: jest.fn(),
  };
};

test(`checkPrivileges.atSpace when spaces is enabled`, async () => {
  const expectedResult = Symbol();
  const spaceId = 'foo-space';
  const mockCheckPrivileges = createMockCheckPrivileges();
  mockCheckPrivileges.atSpace.mockResolvedValue(expectedResult);
  const mockSpaces = {
    isEnabled: true,
    getSpaceId: jest.fn().mockReturnValue(spaceId),
  };
  const request = Symbol();
  const privilegeOrPrivileges = ['foo', 'bar'];
  const checkPrivilegesDynamically = checkPrivilegesDynamicallyWithRequestFactory(
    mockCheckPrivileges,
    mockSpaces
  )(request);
  const result = await checkPrivilegesDynamically(privilegeOrPrivileges);

  expect(result).toBe(expectedResult);
  expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, privilegeOrPrivileges);
});

test(`checkPrivileges.globally when spaces is disabled`, async () => {
  const expectedResult = Symbol();
  const mockCheckPrivileges = createMockCheckPrivileges();
  mockCheckPrivileges.globally.mockResolvedValue(expectedResult);
  const mockSpaces = {
    isEnabled: false,
  };
  const request = Symbol();
  const privilegeOrPrivileges = ['foo', 'bar'];
  const checkPrivilegesDynamically = checkPrivilegesDynamicallyWithRequestFactory(
    mockCheckPrivileges,
    mockSpaces
  )(request);
  const result = await checkPrivilegesDynamically(privilegeOrPrivileges);

  expect(result).toBe(expectedResult);
  expect(mockCheckPrivileges.globally).toHaveBeenCalledWith(privilegeOrPrivileges);
});
