/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import type { CheckSavedObjectsPrivileges } from '../authorization';
import { Actions } from '../authorization';
import type { CheckPrivilegesResponse } from '../authorization/types';
import type { EnsureAuthorizedResult } from './ensure_authorized';
import {
  ensureAuthorized,
  getEnsureAuthorizedActionResult,
  isAuthorizedForObjectInAllSpaces,
} from './ensure_authorized';

describe('ensureAuthorized', () => {
  function setupDependencies() {
    const actions = new Actions('some-version');
    jest
      .spyOn(actions.savedObject, 'get')
      .mockImplementation((type: string, action: string) => `mock-saved_object:${type}/${action}`);
    const errors = {
      decorateForbiddenError: jest.fn().mockImplementation((err) => err),
      decorateGeneralError: jest.fn().mockImplementation((err) => err),
    } as unknown as jest.Mocked<SavedObjectsClientContract['errors']>;
    const checkSavedObjectsPrivilegesAsCurrentUser: jest.MockedFunction<CheckSavedObjectsPrivileges> =
      jest.fn();
    return { actions, errors, checkSavedObjectsPrivilegesAsCurrentUser };
  }

  // These arguments are used for all unit tests below
  const types = ['a', 'b', 'c'];
  const actions = ['foo', 'bar'];
  const namespaces = ['x', 'y'];

  const mockAuthorizedResolvedPrivileges = {
    hasAllRequested: true,
    privileges: {
      kibana: [
        { privilege: 'mock-saved_object:a/foo', authorized: true },
        { privilege: 'mock-saved_object:a/bar', authorized: true },
        { resource: 'x', privilege: 'mock-saved_object:b/foo', authorized: true },
        { resource: 'x', privilege: 'mock-saved_object:b/bar', authorized: true },
        { resource: 'x', privilege: 'mock-saved_object:c/foo', authorized: true },
        { resource: 'x', privilege: 'mock-saved_object:c/bar', authorized: true },
        { resource: 'y', privilege: 'mock-saved_object:b/foo', authorized: true },
        { resource: 'y', privilege: 'mock-saved_object:b/bar', authorized: true },
        { resource: 'y', privilege: 'mock-saved_object:c/foo', authorized: true },
        { resource: 'y', privilege: 'mock-saved_object:c/bar', authorized: true },
      ],
    },
  } as CheckPrivilegesResponse;

  test('calls checkSavedObjectsPrivilegesAsCurrentUser with expected privilege actions and namespaces', async () => {
    const deps = setupDependencies();
    deps.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue(
      mockAuthorizedResolvedPrivileges
    );
    await ensureAuthorized(deps, types, actions, namespaces);
    expect(deps.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
      [
        'mock-saved_object:a/foo',
        'mock-saved_object:a/bar',
        'mock-saved_object:b/foo',
        'mock-saved_object:b/bar',
        'mock-saved_object:c/foo',
        'mock-saved_object:c/bar',
      ],
      namespaces
    );
  });

  test('throws an error when privilege check fails', async () => {
    const deps = setupDependencies();
    deps.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error('Oh no!'));
    expect(ensureAuthorized(deps, [], [], [])).rejects.toThrowError('Oh no!');
  });

  describe('fully authorized', () => {
    const expectedResult = {
      status: 'fully_authorized',
      typeActionMap: new Map([
        [
          'a',
          {
            foo: { isGloballyAuthorized: true, authorizedSpaces: [] },
            bar: { isGloballyAuthorized: true, authorizedSpaces: [] },
          },
        ],
        ['b', { foo: { authorizedSpaces: ['x', 'y'] }, bar: { authorizedSpaces: ['x', 'y'] } }],
        ['c', { foo: { authorizedSpaces: ['x', 'y'] }, bar: { authorizedSpaces: ['x', 'y'] } }],
      ]),
    };

    test('with default options', async () => {
      const deps = setupDependencies();
      deps.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue(
        mockAuthorizedResolvedPrivileges
      );
      const result = await ensureAuthorized(deps, types, actions, namespaces);
      expect(result).toEqual(expectedResult);
    });

    test('with requireFullAuthorization=false', async () => {
      const deps = setupDependencies();
      deps.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue(
        mockAuthorizedResolvedPrivileges
      );
      const options = { requireFullAuthorization: false };
      const result = await ensureAuthorized(deps, types, actions, namespaces, options);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('partially authorized', () => {
    const resolvedPrivileges = {
      hasAllRequested: false,
      privileges: {
        kibana: [
          // For type 'a', the user is authorized to use 'foo' action but not 'bar' action (all spaces)
          // For type 'b', the user is authorized to use 'foo' action but not 'bar' action (both spaces)
          // For type 'c', the user is authorized to use both actions in space 'x' but not space 'y'
          { privilege: 'mock-saved_object:a/foo', authorized: true },
          { privilege: 'mock-saved_object:a/bar', authorized: false },
          { privilege: 'mock-saved_object:a/bar', authorized: true }, // fail-secure check
          { resource: 'x', privilege: 'mock-saved_object:b/foo', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/bar', authorized: false },
          { resource: 'x', privilege: 'mock-saved_object:c/foo', authorized: true },
          { privilege: 'mock-saved_object:c/foo', authorized: false }, // inverse fail-secure check
          { resource: 'x', privilege: 'mock-saved_object:c/bar', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/foo', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/bar', authorized: false },
          { resource: 'y', privilege: 'mock-saved_object:c/foo', authorized: false },
          { resource: 'y', privilege: 'mock-saved_object:c/bar', authorized: false },
          { privilege: 'mock-saved_object:c/bar', authorized: true }, // fail-secure check
          { resource: 'y', privilege: 'mock-saved_object:c/bar', authorized: true }, // fail-secure check
          // The fail-secure checks are a contrived scenario, as we *shouldn't* get both an unauthorized and authorized result for a given resource...
          // However, in case we do, we should fail-secure (authorized + unauthorized = unauthorized)
        ],
      },
    } as CheckPrivilegesResponse;

    test('with default options', async () => {
      const deps = setupDependencies();
      deps.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue(resolvedPrivileges);
      expect(
        ensureAuthorized(deps, types, actions, namespaces)
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Unable to (bar a),(bar b),(bar c),(foo c)"`);
    });

    test('with requireFullAuthorization=false', async () => {
      const deps = setupDependencies();
      deps.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue(resolvedPrivileges);
      const options = { requireFullAuthorization: false };
      const result = await ensureAuthorized(deps, types, actions, namespaces, options);
      expect(result).toEqual({
        status: 'partially_authorized',
        typeActionMap: new Map([
          ['a', { foo: { isGloballyAuthorized: true, authorizedSpaces: [] } }],
          ['b', { foo: { authorizedSpaces: ['x', 'y'] } }],
          ['c', { foo: { authorizedSpaces: ['x'] }, bar: { authorizedSpaces: ['x'] } }],
        ]),
      });
    });
  });

  describe('unauthorized', () => {
    const resolvedPrivileges = {
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/foo', authorized: false },
          { privilege: 'mock-saved_object:a/bar', authorized: false },
          { privilege: 'mock-saved_object:a/bar', authorized: true }, // fail-secure check
          { resource: 'x', privilege: 'mock-saved_object:b/foo', authorized: false },
          { resource: 'x', privilege: 'mock-saved_object:b/bar', authorized: false },
          { resource: 'x', privilege: 'mock-saved_object:c/foo', authorized: false },
          { resource: 'x', privilege: 'mock-saved_object:c/bar', authorized: false },
          { resource: 'y', privilege: 'mock-saved_object:a/foo', authorized: false },
          { resource: 'y', privilege: 'mock-saved_object:a/bar', authorized: false },
          { resource: 'y', privilege: 'mock-saved_object:b/foo', authorized: false },
          { resource: 'y', privilege: 'mock-saved_object:b/bar', authorized: false },
          { resource: 'y', privilege: 'mock-saved_object:c/foo', authorized: false },
          { resource: 'y', privilege: 'mock-saved_object:c/bar', authorized: false },
          { privilege: 'mock-saved_object:c/bar', authorized: true }, // fail-secure check
          { resource: 'y', privilege: 'mock-saved_object:c/bar', authorized: true }, // fail-secure check
          // The fail-secure checks are a contrived scenario, as we *shouldn't* get both an unauthorized and authorized result for a given resource...
          // However, in case we do, we should fail-secure (authorized + unauthorized = unauthorized)
        ],
      },
    } as CheckPrivilegesResponse;

    test('with default options', async () => {
      const deps = setupDependencies();
      deps.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue(resolvedPrivileges);
      expect(
        ensureAuthorized(deps, types, actions, namespaces)
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unable to (bar a),(bar b),(bar c),(foo a),(foo b),(foo c)"`
      );
    });

    test('with requireFullAuthorization=false', async () => {
      const deps = setupDependencies();
      deps.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue(resolvedPrivileges);
      const options = { requireFullAuthorization: false };
      const result = await ensureAuthorized(deps, types, actions, namespaces, options);
      expect(result).toEqual({ status: 'unauthorized', typeActionMap: new Map() });
    });
  });
});

describe('getEnsureAuthorizedActionResult', () => {
  const typeActionMap: EnsureAuthorizedResult<'action'>['typeActionMap'] = new Map([
    ['type', { action: { authorizedSpaces: ['space-id'] } }],
  ]);

  test('returns the appropriate result if it is in the typeActionMap', () => {
    const result = getEnsureAuthorizedActionResult('type', 'action', typeActionMap);
    expect(result).toEqual({ authorizedSpaces: ['space-id'] });
  });

  test('returns an unauthorized result if it is not in the typeActionMap', () => {
    const result = getEnsureAuthorizedActionResult('other-type', 'action', typeActionMap);
    expect(result).toEqual({ authorizedSpaces: [] });
  });
});

describe('isAuthorizedForObjectInAllSpaces', () => {
  const typeActionMap: EnsureAuthorizedResult<'action'>['typeActionMap'] = new Map([
    ['type-1', { action: { authorizedSpaces: [], isGloballyAuthorized: true } }],
    ['type-2', { action: { authorizedSpaces: ['space-1', 'space-2'] } }],
    ['type-3', { action: { authorizedSpaces: [] } }],
    // type-4 is not present in the results
  ]);

  test('returns true if the user is authorized for the type in the given spaces', () => {
    const type1Result = isAuthorizedForObjectInAllSpaces('type-1', 'action', typeActionMap, [
      'space-1',
      'space-2',
      'space-3',
    ]);
    expect(type1Result).toBe(true);

    const type2Result = isAuthorizedForObjectInAllSpaces('type-2', 'action', typeActionMap, [
      'space-1',
      'space-2',
    ]);
    expect(type2Result).toBe(true);
  });

  test('returns false if the user is not authorized for the type in the given spaces', () => {
    const type2Result = isAuthorizedForObjectInAllSpaces('type-2', 'action', typeActionMap, [
      'space-1',
      'space-2',
      'space-3', // the user is not authorized for this type and action in space-3
    ]);
    expect(type2Result).toBe(false);

    const type3Result = isAuthorizedForObjectInAllSpaces('type-3', 'action', typeActionMap, [
      'space-1', // the user is not authorized for this type and action in any space
    ]);
    expect(type3Result).toBe(false);

    const type4Result = isAuthorizedForObjectInAllSpaces('type-4', 'action', typeActionMap, [
      'space-1', // the user is not authorized for this type and action in any space
    ]);
    expect(type4Result).toBe(false);
  });
});
