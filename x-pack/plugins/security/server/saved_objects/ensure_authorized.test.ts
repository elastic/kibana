/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from 'src/core/server';

import type { CheckSavedObjectsPrivileges } from '../authorization';
import { Actions } from '../authorization';
import type { CheckPrivilegesResponse } from '../authorization/types';
import { ensureAuthorized } from './ensure_authorized';

describe('ensureAuthorized', () => {
  function setupDependencies() {
    const actions = new Actions('some-version');
    jest
      .spyOn(actions.savedObject, 'get')
      .mockImplementation((type: string, action: string) => `mock-saved_object:${type}/${action}`);
    const errors = ({
      decorateForbiddenError: jest.fn().mockImplementation((err) => err),
      decorateGeneralError: jest.fn().mockImplementation((err) => err),
    } as unknown) as jest.Mocked<SavedObjectsClientContract['errors']>;
    const checkSavedObjectsPrivilegesAsCurrentUser: jest.MockedFunction<CheckSavedObjectsPrivileges> = jest.fn();
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
          { resource: 'x', privilege: 'mock-saved_object:b/foo', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/bar', authorized: false },
          { resource: 'x', privilege: 'mock-saved_object:c/foo', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:c/bar', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/foo', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/bar', authorized: false },
          { resource: 'y', privilege: 'mock-saved_object:c/foo', authorized: false },
          { resource: 'y', privilege: 'mock-saved_object:c/bar', authorized: false },
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
          { resource: 'x', privilege: 'mock-saved_object:a/foo', authorized: false },
          { resource: 'x', privilege: 'mock-saved_object:a/bar', authorized: false },
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
