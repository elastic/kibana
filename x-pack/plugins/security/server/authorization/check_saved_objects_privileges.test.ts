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

describe('#atNamespaces', () => {
  test(`uses checkPrivileges.atSpaces when spaces is enabled`, async () => {
    const actions = ['foo', 'bar'];
    const namespaces = ['baz', 'qux'];
    const expectedResult = Symbol();
    mockCheckPrivileges.atSpaces.mockReturnValue(expectedResult as any);
    const checkSavedObjectsPrivileges = createFactory();

    const result = await checkSavedObjectsPrivileges.atNamespaces(actions, namespaces);

    expect(result).toBe(expectedResult);
    expect(mockSpacesService!.namespaceToSpaceId).toHaveBeenCalledTimes(2);
    expect(mockSpacesService!.namespaceToSpaceId).toHaveBeenNthCalledWith(1, namespaces[0]);
    expect(mockSpacesService!.namespaceToSpaceId).toHaveBeenNthCalledWith(2, namespaces[1]);
    expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledTimes(1);
    expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
    expect(mockCheckPrivileges.atSpaces).toHaveBeenCalledTimes(1);
    const spaceIds = mockSpacesService!.namespaceToSpaceId.mock.results.map(x => x.value);
    expect(mockCheckPrivileges.atSpaces).toHaveBeenCalledWith(spaceIds, actions);
  });

  test(`throws an error when spaces is disabled`, async () => {
    mockSpacesService = undefined;
    const checkSavedObjectsPrivileges = createFactory();

    await expect(
      checkSavedObjectsPrivileges.atNamespaces('some action', ['some namespace'])
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Can't check saved object privileges at spaces if spaces is disabled"`
    );
  });
});

describe('#dynamically', () => {
  const actions = ['foo', 'bar'];
  const namespace = 'baz';

  test(`uses checkPrivileges.atSpace when spaces is enabled`, async () => {
    const expectedResult = Symbol();
    mockCheckPrivileges.atSpace.mockReturnValue(expectedResult as any);
    const checkSavedObjectsPrivileges = createFactory();

    const result = await checkSavedObjectsPrivileges.dynamically(actions, namespace);

    expect(result).toBe(expectedResult);
    expect(mockSpacesService!.namespaceToSpaceId).toHaveBeenCalledTimes(1);
    expect(mockSpacesService!.namespaceToSpaceId).toHaveBeenCalledWith(namespace);
    expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledTimes(1);
    expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
    expect(mockCheckPrivileges.atSpace).toHaveBeenCalledTimes(1);
    const spaceId = mockSpacesService!.namespaceToSpaceId.mock.results[0].value;
    expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, actions);
  });

  test(`uses checkPrivileges.globally when spaces is disabled`, async () => {
    const expectedResult = Symbol();
    mockCheckPrivileges.globally.mockReturnValue(expectedResult as any);
    mockSpacesService = undefined;
    const checkSavedObjectsPrivileges = createFactory();

    const result = await checkSavedObjectsPrivileges.dynamically(actions, namespace);

    expect(result).toBe(expectedResult);
    expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledTimes(1);
    expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
    expect(mockCheckPrivileges.globally).toHaveBeenCalledTimes(1);
    expect(mockCheckPrivileges.globally).toHaveBeenCalledWith(actions);
  });
});
