/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AuditAction } from '@kbn/core-saved-objects-server';
import type { EcsEventOutcome, SavedObjectsClient } from '@kbn/core/server';

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
  } as unknown as jest.Mocked<SavedObjectsClient['errors']>;
  const checkPrivileges: jest.MockedFunction<CheckSavedObjectsPrivileges> = jest.fn();
  const securityExtension = new SavedObjectsSecurityExtension({
    actions,
    auditLogger,
    errors,
    checkPrivileges,
  });
  return { actions, auditLogger, errors, checkPrivileges, securityExtension };
}

describe('#enforceAuthorization', () => {
  test('fully authorized', () => {
    const { securityExtension } = setup();

    const authorizationResult = {
      status: 'fully_authorized',
      typeMap: new Map()
        .set('a', {
          foo: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('b', {
          foo: { authorizedSpaces: ['x', 'y'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('c', {
          foo: { authorizedSpaces: ['y', 'z'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
    };

    const spacesToEnforce = new Set(['x', 'y', 'z']);

    expect(() =>
      securityExtension.enforceAuthorization({
        typesAndSpaces: new Map([
          ['a', spacesToEnforce],
          ['b', new Set(['x', 'y'])],
          ['c', new Set(['y', 'z'])],
        ]),
        action: 'foo',
        typeMap: authorizationResult.typeMap,
      })
    ).not.toThrowError();
  });

  test('partially authorized', () => {
    const { securityExtension } = setup();

    const authorizationResult = {
      status: 'partially_authorized',
      typeMap: new Map()
        .set('a', {
          foo: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('b', {
          foo: { authorizedSpaces: ['x'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('c', {
          foo: { authorizedSpaces: ['z'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
    };

    const spacesToEnforce = new Set(['x', 'y', 'z']);

    expect(() =>
      securityExtension.enforceAuthorization({
        typesAndSpaces: new Map([
          ['a', spacesToEnforce],
          ['b', new Set(['x', 'y'])],
          ['c', new Set(['y', 'z'])],
        ]),
        action: 'foo',
        typeMap: authorizationResult.typeMap,
      })
    ).toThrowError('Unable to foo b,c');
  });

  test('unauthorized', () => {
    const { securityExtension } = setup();

    const authorizationResult = {
      status: 'unauthorized',
      typeMap: new Map()
        .set('a', {
          foo: { authorizedSpaces: ['x'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('b', {
          foo: { authorizedSpaces: ['y'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('c', {
          foo: { authorizedSpaces: ['z'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
    };

    expect(() =>
      securityExtension.enforceAuthorization({
        typesAndSpaces: new Map([
          ['a', new Set(['y', 'z'])],
          ['b', new Set(['x', 'z'])],
          ['c', new Set(['x', 'y'])],
        ]),
        action: 'foo',
        typeMap: authorizationResult.typeMap,
      })
    ).toThrowError('Unable to foo a,b,c');
  });
});

describe('#performAuthorization', () => {
  describe('without enforce', () => {
    // These arguments are used for all unit tests below
    const types = new Set(['a', 'b', 'c']);
    const spaces = new Set(['x', 'y']);
    const actions = new Set(['foo', 'bar']);

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
    test('calls performPrivileges with expected privilege actions and namespaces', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      await securityExtension.performAuthorization({ types, spaces, actions });
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
        securityExtension.performAuthorization({ types: new Set(), spaces, actions })
      ).rejects.toThrowError('No types specified for authorization check');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when `spaces` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();

      await expect(
        securityExtension.performAuthorization({ types, spaces: new Set(), actions })
      ).rejects.toThrowError('No spaces specified for authorization check');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when `actions` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();

      await expect(
        securityExtension.performAuthorization({ types, spaces, actions: new Set([]) })
      ).rejects.toThrowError('No actions specified for authorization check');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when privilege check fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.performAuthorization({ types, spaces, actions })
      ).rejects.toThrowError('Oh no!');
    });

    test('fully authorized', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      const result = await securityExtension.performAuthorization({ types, spaces, actions });

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

      const result = await securityExtension.performAuthorization({ types, spaces, actions });
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

      const result = await securityExtension.performAuthorization({ types, spaces, actions });
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

    test('conflicting privilege failsafe', async () => {
      const conflictingPrivilegesResponse = {
        hasAllRequested: true,
        privileges: {
          kibana: [
            // redundant conflicting privileges for space X, type B, action Foo
            { resource: 'x', privilege: 'mock-saved_object:b/foo', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:b/foo', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:b/foo', authorized: true },
          ],
        },
      } as CheckPrivilegesResponse;

      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(conflictingPrivilegesResponse);

      const result = await securityExtension.performAuthorization({ types, spaces, actions });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: new Map().set('b', {
          foo: { authorizedSpaces: ['y'] }, // should NOT be authorized for conflicted privilege
        }),
      });
    });
  });

  describe('with enforce', () => {
    // These arguments are used for all unit tests below
    const types = new Set(['a', 'b', 'c']);
    const spaces = new Set(['x', 'y']);
    const actions = new Set(['foo']);

    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/foo', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/foo', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:c/foo', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/foo', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:c/foo', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    const partiallyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/foo', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/foo', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:c/foo', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    const unauthorizedCheckPrivilegesResponse = {
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:a/foo', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/foo', authorized: true },
          { resource: 'z', privilege: 'mock-saved_object:c/foo', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    test('fully authorized', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await expect(() =>
        securityExtension.performAuthorization({
          actions,
          types,
          spaces,
          enforceMap: new Map([
            ['a', new Set(['x', 'y', 'z'])],
            ['b', new Set(['x', 'y'])],
            ['c', new Set(['y'])],
          ]),
        })
      ).not.toThrowError();
    });

    test('partially authorized', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse);

      await expect(() =>
        securityExtension.performAuthorization({
          actions,
          types,
          spaces,
          enforceMap: new Map([
            ['a', new Set(['x', 'y', 'z'])],
            ['b', new Set(['x', 'y'])],
            ['c', new Set(['x', 'y'])],
          ]),
        })
      ).rejects.toThrowError('Unable to foo b,c');
    });

    test('unauthorized', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(unauthorizedCheckPrivilegesResponse);

      await expect(() =>
        securityExtension.performAuthorization({
          actions,
          types,
          spaces,
          enforceMap: new Map([
            ['a', new Set(['y', 'z'])],
            ['b', new Set(['x', 'z'])],
            ['c', new Set(['x', 'y'])],
          ]),
        })
      ).rejects.toThrowError('Unable to foo a,b,c');
    });
  });
});

describe('#addAuditEvent', () => {
  test(`adds an unknown audit event`, async () => {
    const { auditLogger, securityExtension } = setup();
    const action = AuditAction.UPDATE_OBJECTS_SPACES;
    const outcome: EcsEventOutcome = 'unknown';
    const savedObject = { type: 'dashboard', id: '3' };
    const spaces = ['space-id'];

    const auditParams = {
      action,
      outcome,
      savedObject,
      deleteFromSpaces: spaces,
    };

    securityExtension.addAuditEvent(auditParams);

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action,
          outcome,
        }),
        kibana: savedObject
          ? expect.objectContaining({
              saved_object: savedObject,
              delete_from_spaces: spaces,
            })
          : expect.anything(),
        message: `User is updating spaces of ${savedObject.type} [id=${savedObject.id}]`,
      })
    );
  });

  test(`adds a success audit event`, async () => {
    const { auditLogger, securityExtension } = setup();
    const action = AuditAction.UPDATE_OBJECTS_SPACES;
    const outcome: EcsEventOutcome = 'success';
    const savedObject = { type: 'dashboard', id: '3' };
    const spaces = ['space-id'];

    const auditParams = {
      action,
      outcome,
      savedObject,
      addToSpaces: spaces,
    };

    securityExtension.addAuditEvent(auditParams);

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        event: expect.objectContaining({
          action,
          outcome,
        }),
        kibana: savedObject
          ? expect.objectContaining({
              saved_object: savedObject,
              add_to_spaces: spaces,
            })
          : expect.anything(),
        message: `User has updated spaces of ${savedObject.type} [id=${savedObject.id}]`,
      })
    );
  });

  test(`adds a failure audit event`, async () => {
    const { auditLogger, securityExtension } = setup();
    const action = AuditAction.DELETE;
    const outcome: EcsEventOutcome = 'failure';
    const savedObject = { type: 'dashboard', id: '3' };
    const error: Error = {
      name: 'test_error',
      message: 'this is just a test',
    };

    const auditParams = {
      action,
      outcome,
      savedObject,
      error,
    };

    securityExtension.addAuditEvent(auditParams);

    expect(auditLogger.log).toHaveBeenCalledWith(
      expect.objectContaining({
        error: { code: error.name, message: error.message },
        event: expect.objectContaining({
          action,
          outcome,
        }),
        kibana: savedObject
          ? expect.objectContaining({
              saved_object: savedObject,
            })
          : expect.anything(),
        message: `Failed attempt to delete ${savedObject.type} [id=${savedObject.id}]`,
      })
    );
  });
});

describe('#redactNamespaces', () => {
  test(`filters namespaces that the user doesn't have access to`, () => {
    const { securityExtension } = setup();

    const typeMap = new Map().set('so-type', {
      // redact is only concerned with 'login' attribute, not specific action
      ['login:']: { authorizedSpaces: ['authorized-space'] },
    });

    const so = {
      id: 'some-id',
      type: 'so-type',
      namespaces: ['authorized-space', 'unauthorized-space'],
      attributes: {
        test: 'attr',
      },
      score: 1,
      references: [],
    };

    const result = securityExtension.redactNamespaces({ typeMap, savedObject: so });
    expect(result).toEqual(expect.objectContaining({ namespaces: ['authorized-space', '?'] }));
  });

  test(`does not redact on isGloballyAuthorized`, () => {
    const { securityExtension } = setup();

    const typeMap = new Map().set('so-type', {
      // redact is only concerned with 'login' attribute, not specific action
      ['login:']: { isGloballyAuthorized: true },
    });

    const so = {
      id: 'some-id',
      type: 'so-type',
      namespaces: ['space-a', 'space-b', 'space-c'],
      attributes: {
        test: 'attr',
      },
      score: 1,
      references: [],
    };

    const result = securityExtension.redactNamespaces({ typeMap, savedObject: so });
    expect(result).toEqual(
      expect.objectContaining({ namespaces: ['space-a', 'space-b', 'space-c'] })
    );
  });
});
