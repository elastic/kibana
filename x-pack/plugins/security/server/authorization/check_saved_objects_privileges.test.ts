/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { checkSavedObjectsPrivilegesWithRequestFactory } from './check_saved_objects_privileges';

import { httpServerMock } from '../../../../../src/core/server/mocks';
import { CheckPrivileges, CheckPrivilegesWithRequest } from './check_privileges';
import { SpacesService } from '../plugin';

let mockCheckPrivileges: jest.Mocked<CheckPrivileges>;
let mockCheckPrivilegesWithRequest: jest.Mocked<CheckPrivilegesWithRequest>;
let mockSpacesService: jest.Mocked<SpacesService> | undefined;
const request = httpServerMock.createKibanaRequest();

const createFactory = () =>
  checkSavedObjectsPrivilegesWithRequestFactory(
    mockCheckPrivilegesWithRequest,
    () => mockSpacesService
  )(request);

beforeEach(() => {
  mockCheckPrivileges = {
    atSpace: jest.fn(),
    atSpaces: jest.fn(),
    globally: jest.fn(),
  };
  mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);

  mockSpacesService = {
    getSpaceId: jest.fn(),
    namespaceToSpaceId: jest.fn().mockImplementation((namespace: string) => `${namespace}-id`),
  };
});

describe('#checkSavedObjectsPrivileges', () => {
  const actions = ['foo', 'bar'];
  const namespace1 = 'baz';
  const namespace2 = 'qux';

  describe('when checking multiple namespaces', () => {
    const namespaces = [namespace1, namespace2];

    test(`throws an error when Spaces is disabled`, async () => {
      mockSpacesService = undefined;
      const checkSavedObjectsPrivileges = createFactory();

      await expect(
        checkSavedObjectsPrivileges(actions, namespaces)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Can't check saved object privileges for multiple namespaces if Spaces is disabled"`
      );
    });

    test(`throws an error when using an empty namespaces array`, async () => {
      const checkSavedObjectsPrivileges = createFactory();

      await expect(
        checkSavedObjectsPrivileges(actions, [])
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Can't check saved object privileges for 0 namespaces"`
      );
    });

    test(`uses checkPrivileges.atSpaces when spaces is enabled`, async () => {
      const expectedResult = Symbol();
      mockCheckPrivileges.atSpaces.mockReturnValue(expectedResult as any);
      const checkSavedObjectsPrivileges = createFactory();

      const result = await checkSavedObjectsPrivileges(actions, namespaces);

      expect(result).toBe(expectedResult);
      expect(mockSpacesService!.namespaceToSpaceId).toHaveBeenCalledTimes(2);
      expect(mockSpacesService!.namespaceToSpaceId).toHaveBeenNthCalledWith(1, namespace1);
      expect(mockSpacesService!.namespaceToSpaceId).toHaveBeenNthCalledWith(2, namespace2);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledTimes(1);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivileges.atSpaces).toHaveBeenCalledTimes(1);
      const spaceIds = mockSpacesService!.namespaceToSpaceId.mock.results.map((x) => x.value);
      expect(mockCheckPrivileges.atSpaces).toHaveBeenCalledWith(spaceIds, actions);
    });
  });

  describe('when checking a single namespace', () => {
    test(`uses checkPrivileges.atSpace when Spaces is enabled`, async () => {
      const expectedResult = Symbol();
      mockCheckPrivileges.atSpace.mockReturnValue(expectedResult as any);
      const checkSavedObjectsPrivileges = createFactory();

      const result = await checkSavedObjectsPrivileges(actions, namespace1);

      expect(result).toBe(expectedResult);
      expect(mockSpacesService!.namespaceToSpaceId).toHaveBeenCalledTimes(1);
      expect(mockSpacesService!.namespaceToSpaceId).toHaveBeenCalledWith(namespace1);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledTimes(1);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledTimes(1);
      const spaceId = mockSpacesService!.namespaceToSpaceId.mock.results[0].value;
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, actions);
    });

    test(`uses checkPrivileges.globally when Spaces is disabled`, async () => {
      const expectedResult = Symbol();
      mockCheckPrivileges.globally.mockReturnValue(expectedResult as any);
      mockSpacesService = undefined;
      const checkSavedObjectsPrivileges = createFactory();

      const result = await checkSavedObjectsPrivileges(actions, namespace1);

      expect(result).toBe(expectedResult);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledTimes(1);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledTimes(1);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith(actions);
    });
  });
});
