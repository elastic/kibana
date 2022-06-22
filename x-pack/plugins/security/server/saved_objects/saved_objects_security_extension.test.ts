/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { auditLoggerMock } from '../audit/mocks';
import type { CheckSavedObjectsPrivileges } from '../authorization';
import { Actions } from '../authorization';
import type { CheckPrivilegesResponse } from '../authorization/types';
import { SavedObjectsSecurityExtension } from './saved_objects_security_extension';

function setup() {
  const actions = new Actions('some-version');
  jest
    .spyOn(actions.savedObject, 'get')
    .mockImplementation((type: string, action: string) => `mock-saved_object:${type}/${action}`);
  const auditLogger = auditLoggerMock.create();
  const errors = {
    decorateForbiddenError: jest.fn().mockImplementation((err) => err),
    decorateGeneralError: jest.fn().mockImplementation((err) => err),
  } as unknown as jest.Mocked<SavedObjectsClientContract['errors']>;
  const checkPrivileges: jest.MockedFunction<CheckSavedObjectsPrivileges> = jest.fn();
  const securityExtension = new SavedObjectsSecurityExtension({
    actions,
    auditLogger,
    errors,
    checkPrivileges,
  });
  return { actions, auditLogger, errors, checkPrivileges, securityExtension };
}

describe('#checkAuthorization', () => {
  // These arguments are used for all unit tests below
  const types = new Set(['a', 'b', 'c']);
  const spaces = new Set(['x', 'y']);
  const actions = ['foo', 'bar'];

  const fullyAuthorizedCheckPrivilegesResponse = {
    hasAllRequested: true,
    privileges: {
      kibana: [
        { privilege: 'mock-saved_object:a/foo', authorized: true },
        { privilege: 'mock-saved_object:a/bar', authorized: true },
        { privilege: 'login:', authorized: true },
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

  test('calls checkPrivileges with expected privilege actions and namespaces', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

    await securityExtension.checkAuthorization({ types, spaces, actions });
    expect(checkPrivileges).toHaveBeenCalledWith(
      [
        'mock-saved_object:a/foo',
        'mock-saved_object:a/bar',
        'mock-saved_object:b/foo',
        'mock-saved_object:b/bar',
        'mock-saved_object:c/foo',
        'mock-saved_object:c/bar',
        'login:',
      ],
      [...spaces]
    );
  });

  test('throws an error when `types` is empty', async () => {
    const { securityExtension, checkPrivileges } = setup();

    await expect(
      securityExtension.checkAuthorization({ types: new Set(), spaces, actions })
    ).rejects.toThrowError('Failed to check authorization for 0 object types');
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('throws an error when `spaces` is empty', async () => {
    const { securityExtension, checkPrivileges } = setup();

    await expect(
      securityExtension.checkAuthorization({ types, spaces: new Set(), actions })
    ).rejects.toThrowError('Failed to check authorization for 0 spaces');
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('throws an error when `actions` is empty', async () => {
    const { securityExtension, checkPrivileges } = setup();

    await expect(
      securityExtension.checkAuthorization({ types, spaces, actions: [] })
    ).rejects.toThrowError('Failed to check authorization for 0 actions');
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('throws an error when privilege check fails', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockRejectedValue(new Error('Oh no!'));

    await expect(
      securityExtension.checkAuthorization({ types, spaces, actions })
    ).rejects.toThrowError('Oh no!');
  });

  test('fully authorized', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    const result = await securityExtension.checkAuthorization({ types, spaces, actions });
    expect(result).toEqual({
      status: 'fully_authorized',
      typeMap: new Map()
        .set('a', {
          foo: { isGloballyAuthorized: true, authorizedSpaces: [] },
          bar: { isGloballyAuthorized: true, authorizedSpaces: [] },
          // Technically, 'login:' is not a saved object action, it is a Kibana privilege -- however, we include it in the `typeMap` results
          // for ease of use with the `redactNamespaces` function. The user is never actually authorized to "login" for a given object type,
          // they are authorized to log in on a per-space basis, and this is applied to each object type in the typeMap result accordingly.
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('b', {
          foo: { authorizedSpaces: ['x', 'y'] },
          bar: { authorizedSpaces: ['x', 'y'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('c', {
          foo: { authorizedSpaces: ['x', 'y'] },
          bar: { authorizedSpaces: ['x', 'y'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
    });
  });

  test('partially authorized', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
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
          { resource: 'x', privilege: 'login:', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/foo', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/bar', authorized: false },
          { resource: 'y', privilege: 'mock-saved_object:c/foo', authorized: false },
          { resource: 'y', privilege: 'mock-saved_object:c/bar', authorized: false },
          { privilege: 'mock-saved_object:c/bar', authorized: true }, // fail-secure check
          { resource: 'y', privilege: 'mock-saved_object:c/bar', authorized: true }, // fail-secure check
          { resource: 'y', privilege: 'login:', authorized: true },
          // The fail-secure checks are a contrived scenario, as we *shouldn't* get both an unauthorized and authorized result for a given resource...
          // However, in case we do, we should fail-secure (authorized + unauthorized = unauthorized)
        ],
      },
    } as CheckPrivilegesResponse);

    const result = await securityExtension.checkAuthorization({ types, spaces, actions });
    expect(result).toEqual({
      status: 'partially_authorized',
      typeMap: new Map()
        .set('a', {
          foo: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { authorizedSpaces: ['x', 'y'] },
        })
        .set('b', {
          foo: { authorizedSpaces: ['x', 'y'] },
          ['login:']: { authorizedSpaces: ['x', 'y'] },
        })
        .set('c', {
          foo: { authorizedSpaces: ['x'] },
          bar: { authorizedSpaces: ['x'] },
          ['login:']: { authorizedSpaces: ['x', 'y'] },
        }),
    });
  });

  test('unauthorized', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
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
          { resource: 'x', privilege: 'login:', authorized: false },
          { resource: 'x', privilege: 'login:', authorized: true }, // fail-secure check
          { resource: 'y', privilege: 'mock-saved_object:a/foo', authorized: false },
          { resource: 'y', privilege: 'mock-saved_object:a/bar', authorized: false },
          { resource: 'y', privilege: 'mock-saved_object:b/foo', authorized: false },
          { resource: 'y', privilege: 'mock-saved_object:b/bar', authorized: false },
          { resource: 'y', privilege: 'mock-saved_object:c/foo', authorized: false },
          { resource: 'y', privilege: 'mock-saved_object:c/bar', authorized: false },
          { privilege: 'mock-saved_object:c/bar', authorized: true }, // fail-secure check
          { resource: 'y', privilege: 'mock-saved_object:c/bar', authorized: true }, // fail-secure check
          { resource: 'y', privilege: 'login:', authorized: true }, // should *not* result in a 'partially_authorized' status
          // The fail-secure checks are a contrived scenario, as we *shouldn't* get both an unauthorized and authorized result for a given resource...
          // However, in case we do, we should fail-secure (authorized + unauthorized = unauthorized)
        ],
      },
    } as CheckPrivilegesResponse);

    const result = await securityExtension.checkAuthorization({ types, spaces, actions });
    expect(result).toEqual({
      // The user is authorized to log into space Y, but they are not authorized to take any actions on any of the requested object types.
      // Therefore, the status is 'unauthorized'.
      status: 'unauthorized',
      typeMap: new Map()
        .set('a', { ['login:']: { authorizedSpaces: ['y'] } })
        .set('b', { ['login:']: { authorizedSpaces: ['y'] } })
        .set('c', { ['login:']: { authorizedSpaces: ['y'] } }),
    });
  });
});

test.todo('#enforceAuthorization');

test.todo('#addAuditEvent');

test.todo('#redactNamespaces');
