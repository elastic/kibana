/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';

import type { SpacesService } from '../plugin';
import { checkSavedObjectsPrivilegesWithRequestFactory } from './check_saved_objects_privileges';
import type { CheckPrivileges, CheckPrivilegesWithRequest } from './types';

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
    namespaceToSpaceId: jest
      .fn()
      .mockImplementation((namespace: string = 'default') => `${namespace}-id`),
  };
});

describe('#checkSavedObjectsPrivileges', () => {
  const actions = ['foo', 'bar'];
  const namespace1 = 'baz';
  const namespace2 = 'qux';

  describe('when checking multiple namespaces', () => {
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

      const namespaces = [namespace1, namespace2];
      const result = await checkSavedObjectsPrivileges(actions, namespaces);

      expect(result).toBe(expectedResult);
      expect(mockSpacesService!.namespaceToSpaceId).toHaveBeenCalledTimes(2);
      expect(mockSpacesService!.namespaceToSpaceId).toHaveBeenNthCalledWith(1, namespace1);
      expect(mockSpacesService!.namespaceToSpaceId).toHaveBeenNthCalledWith(2, namespace2);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledTimes(1);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivileges.atSpaces).toHaveBeenCalledTimes(1);
      const spaceIds = mockSpacesService!.namespaceToSpaceId.mock.results.map((x) => x.value);
      expect(mockCheckPrivileges.atSpaces).toHaveBeenCalledWith(spaceIds, { kibana: actions });
    });

    test(`de-duplicates namespaces`, async () => {
      const expectedResult = Symbol();
      mockCheckPrivileges.atSpaces.mockReturnValue(expectedResult as any);
      const checkSavedObjectsPrivileges = createFactory();

      const namespaces = [undefined, 'default', namespace1, namespace1];
      const result = await checkSavedObjectsPrivileges(actions, namespaces);

      expect(result).toBe(expectedResult);
      expect(mockSpacesService!.namespaceToSpaceId).toHaveBeenCalledTimes(4);
      expect(mockSpacesService!.namespaceToSpaceId).toHaveBeenNthCalledWith(1, undefined);
      expect(mockSpacesService!.namespaceToSpaceId).toHaveBeenNthCalledWith(2, 'default');
      expect(mockSpacesService!.namespaceToSpaceId).toHaveBeenNthCalledWith(3, namespace1);
      expect(mockSpacesService!.namespaceToSpaceId).toHaveBeenNthCalledWith(4, namespace1);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledTimes(1);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivileges.atSpaces).toHaveBeenCalledTimes(1);
      const spaceIds = [
        mockSpacesService!.namespaceToSpaceId(undefined), // deduplicated with 'default'
        mockSpacesService!.namespaceToSpaceId(namespace1), // deduplicated with namespace1
      ];
      expect(mockCheckPrivileges.atSpaces).toHaveBeenCalledWith(spaceIds, { kibana: actions });
    });

    test(`uses checkPrivileges.globally when checking for "all spaces" (*)`, async () => {
      const expectedResult = Symbol();
      mockCheckPrivileges.globally.mockReturnValue(expectedResult as any);
      mockSpacesService = undefined;
      const checkSavedObjectsPrivileges = createFactory();

      const namespaces = [undefined, 'default', namespace1, namespace1, '*'];
      const result = await checkSavedObjectsPrivileges(actions, namespaces);

      expect(result).toBe(expectedResult);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledTimes(1);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledTimes(1);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith({ kibana: actions });
    });

    test(`uses checkPrivileges.globally when Spaces is disabled`, async () => {
      const expectedResult = Symbol();
      mockCheckPrivileges.globally.mockReturnValue(expectedResult as any);
      mockSpacesService = undefined;
      const checkSavedObjectsPrivileges = createFactory();

      const namespaces = [undefined, 'default', namespace1, namespace1, '*'];
      const result = await checkSavedObjectsPrivileges(actions, namespaces);

      expect(result).toBe(expectedResult);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledTimes(1);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledTimes(1);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith({ kibana: actions });
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
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, { kibana: actions });
    });

    test(`uses checkPrivileges.globally when checking for "all spaces" (*)`, async () => {
      const expectedResult = Symbol();
      mockCheckPrivileges.globally.mockReturnValue(expectedResult as any);
      mockSpacesService = undefined;
      const checkSavedObjectsPrivileges = createFactory();

      const result = await checkSavedObjectsPrivileges(actions, '*');

      expect(result).toBe(expectedResult);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledTimes(1);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledTimes(1);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith({ kibana: actions });
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
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith({ kibana: actions });
    });
  });
});
