/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkSavedObjectsPrivilegesWithRequestFactory } from './check_saved_objects_privileges';

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
  const mockSpacesService = {
    getSpaceId: jest.fn(),
    namespaceToSpaceId: jest.fn().mockReturnValue(spaceId),
  };

  const checkSavedObjectsPrivileges = checkSavedObjectsPrivilegesWithRequestFactory(
    mockCheckPrivilegesWithRequest,
    () => mockSpacesService
  )(request);

  const namespace = 'foo';

  const result = await checkSavedObjectsPrivileges(privilegeOrPrivileges, namespace);

  expect(result).toBe(expectedResult);
  expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
  expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, privilegeOrPrivileges);
  expect(mockSpacesService.namespaceToSpaceId).toBeCalledWith(namespace);
});

test(`checkPrivileges.globally when spaces is disabled`, async () => {
  const expectedResult = Symbol();
  const mockCheckPrivileges = {
    globally: jest.fn().mockReturnValue(expectedResult),
  };
  const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);

  const request = httpServerMock.createKibanaRequest();

  const privilegeOrPrivileges = ['foo', 'bar'];

  const checkSavedObjectsPrivileges = checkSavedObjectsPrivilegesWithRequestFactory(
    mockCheckPrivilegesWithRequest,
    () => undefined
  )(request);

  const namespace = 'foo';

  const result = await checkSavedObjectsPrivileges(privilegeOrPrivileges, namespace);

  expect(result).toBe(expectedResult);
  expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
  expect(mockCheckPrivileges.globally).toHaveBeenCalledWith(privilegeOrPrivileges);
});
