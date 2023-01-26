/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResolveError } from '@kbn/core-saved-objects-common';
import type { AuthorizeCreateObject, AuthorizeUpdateObject } from '@kbn/core-saved-objects-server';
import { AuditAction, SecurityAction } from '@kbn/core-saved-objects-server';
import type {
  AuthorizeBulkGetObject,
  AuthorizeObjectWithExistingSpaces,
} from '@kbn/core-saved-objects-server/src/extensions/security';
import type {
  EcsEventOutcome,
  SavedObjectReferenceWithContext,
  SavedObjectsClient,
  SavedObjectsResolveResponse,
} from '@kbn/core/server';

import { auditLoggerMock } from '../audit/mocks';
import type { CheckSavedObjectsPrivileges } from '../authorization';
import { Actions } from '../authorization';
import type { CheckPrivilegesResponse } from '../authorization/types';
import { SavedObjectsSecurityExtension } from './saved_objects_security_extension';

const checkAuthorizationSpy = jest.spyOn(
  SavedObjectsSecurityExtension.prototype as any,
  'checkAuthorization'
);
const enforceAuthorizationSpy = jest.spyOn(
  SavedObjectsSecurityExtension.prototype as any,
  'enforceAuthorization'
);
const redactNamespacesSpy = jest.spyOn(
  SavedObjectsSecurityExtension.prototype as any,
  'redactNamespaces'
);
const authorizeSpy = jest.spyOn(SavedObjectsSecurityExtension.prototype as any, 'authorize');
const auditHelperSpy = jest.spyOn(SavedObjectsSecurityExtension.prototype as any, 'auditHelper');
const addAuditEventSpy = jest.spyOn(
  SavedObjectsSecurityExtension.prototype as any,
  'addAuditEvent'
);

const obj1 = {
  type: 'a',
  id: '6.0.0-alpha1',
  objectNamespace: 'foo',
  initialNamespaces: ['foo'],
  existingNamespaces: undefined,
};
const obj2 = {
  type: 'b',
  id: 'logstash-*',
  objectNamespace: undefined,
  initialNamespaces: undefined,
  existingNamespaces: undefined,
};
const obj3 = {
  type: 'c',
  id: '6.0.0-charlie3',
  objectNamespace: undefined,
  initialNamespaces: undefined,
  existingNamespaces: ['bar'],
};
const obj4 = {
  type: 'd',
  id: '6.0.0-disco4',
  objectNamespace: 'y',
  initialNamespaces: ['y'],
  existingNamespaces: ['z'],
};

function setupSimpleCheckPrivsMockResolve(
  checkPrivileges: jest.MockedFunction<CheckSavedObjectsPrivileges>,
  type: string,
  action: string,
  authorized: boolean
) {
  checkPrivileges.mockResolvedValue({
    hasAllRequested: authorized,
    privileges: {
      kibana: [
        { privilege: `mock-saved_object:${type}/${action}`, authorized },
        { privilege: 'login:', authorized: true },
      ],
    },
  } as CheckPrivilegesResponse);
}

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

describe.skip('#enforceAuthorization (private)', () => {
  test('fully authorized', () => {
    const { securityExtension } = setup();

    const authorizationResult = {
      status: 'fully_authorized',
      typeMap: new Map()
        .set('a', {
          create: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('b', {
          create: { authorizedSpaces: ['x', 'y'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('c', {
          create: { authorizedSpaces: ['y', 'z'] },
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
        action: SecurityAction.CREATE,
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
          create: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('b', {
          create: { authorizedSpaces: ['x'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('c', {
          create: { authorizedSpaces: ['z'] },
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
        action: SecurityAction.CREATE,
        typeMap: authorizationResult.typeMap,
      })
    ).toThrowError('Unable to create b,c');
  });

  test('unauthorized', () => {
    const { securityExtension } = setup();

    const authorizationResult = {
      status: 'unauthorized',
      typeMap: new Map()
        .set('a', {
          create: { authorizedSpaces: ['x'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('b', {
          create: { authorizedSpaces: ['y'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('c', {
          create: { authorizedSpaces: ['z'] },
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
        action: SecurityAction.CREATE,
        typeMap: authorizationResult.typeMap,
      })
    ).toThrowError('Unable to create a,b,c');
  });
});

describe.skip('#authorize (private)', () => {
  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  describe('without enforce', () => {
    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_update', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/bulk_update', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:c/bulk_update', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/bulk_update', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:c/bulk_update', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    // These arguments are used for all unit tests below
    const types = new Set(['a', 'b', 'c']);
    const spaces = new Set(['x', 'y']);
    const actions = new Set([SecurityAction.BULK_UPDATE]);

    test('checks authorization with expected actions, types, and spaces', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      // ToDo: replace with call to authorizeUpdate
      // Disable to test private method
      // eslint-disable-next-line dot-notation
      await securityExtension['authorize']({ types, spaces, actions });
      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set(['bulk_update']),
        spaces,
        types,
        options: { allowGlobalResource: false },
      });
      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [
          'mock-saved_object:a/bulk_update',
          'mock-saved_object:b/bulk_update',
          'mock-saved_object:c/bulk_update',
          'login:',
        ],
        [...spaces]
      );
      expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
    });

    test('calls checkPrivileges with expected privilege actions and spaces', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      // Disable to test private method
      // eslint-disable-next-line dot-notation
      await securityExtension['authorize']({ types, spaces, actions });
      expect(checkPrivileges).toHaveBeenCalledWith(
        [
          'mock-saved_object:a/create',
          'mock-saved_object:a/update',
          'mock-saved_object:b/create',
          'mock-saved_object:b/update',
          'mock-saved_object:c/create',
          'mock-saved_object:c/update',
          'login:',
        ],
        [...spaces]
      );
    });

    test('throws an error when `types` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();

      await expect(
        // Disable to test private method
        // eslint-disable-next-line dot-notation
        securityExtension['authorize']({ types: new Set(), spaces, actions })
      ).rejects.toThrowError('No types specified for authorization');
      expect(checkAuthorizationSpy).not.toHaveBeenCalled();
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when `spaces` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();

      await expect(
        // Disable to test private method
        // eslint-disable-next-line dot-notation
        securityExtension['authorize']({ types, spaces: new Set(), actions })
      ).rejects.toThrowError('No spaces specified for authorization');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when `actions` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();

      await expect(
        // Disable to test private method
        // eslint-disable-next-line dot-notation
        securityExtension['authorize']({ types, spaces, actions: new Set() })
      ).rejects.toThrowError('No actions specified for authorization');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when privilege check fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        // Disable to test private method
        // eslint-disable-next-line dot-notation
        securityExtension['authorize']({ types, spaces, actions })
      ).rejects.toThrowError('Oh no!');
    });

    test('fully authorized', async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      // Disable to test private method
      // eslint-disable-next-line dot-notation
      const result = await securityExtension['authorize']({ types, spaces, actions });
      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
      expect(auditLogger.log).not.toHaveBeenCalled(); // We're performing authz but no enforce, therefore no audit
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: new Map()
          .set('a', {
            create: { isGloballyAuthorized: true, authorizedSpaces: [] },
            update: { isGloballyAuthorized: true, authorizedSpaces: [] },
            // Technically, 'login:' is not a saved object action, it is a Kibana privilege -- however, we include it in the `typeMap` results
            // for ease of use with the `redactNamespaces` function. The user is never actually authorized to "login" for a given object type,
            // they are authorized to log in on a per-space basis, and this is applied to each object type in the typeMap result accordingly.
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set('b', {
            create: { authorizedSpaces: ['x', 'y'] },
            update: { authorizedSpaces: ['x', 'y'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set('c', {
            create: { authorizedSpaces: ['x', 'y'] },
            update: { authorizedSpaces: ['x', 'y'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          }),
      });
    });

    test('partially authorized', async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            // For type 'a', the user is authorized to use 'create' action but not 'update' action (all spaces)
            // For type 'b', the user is authorized to use 'create' action but not 'update' action (both spaces)
            // For type 'c', the user is authorized to use both actions in space 'x' but not space 'y'
            { privilege: 'mock-saved_object:a/create', authorized: true },
            { privilege: 'mock-saved_object:a/update', authorized: false },
            { privilege: 'mock-saved_object:a/update', authorized: true }, // fail-secure check
            { resource: 'x', privilege: 'mock-saved_object:b/create', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:b/update', authorized: false },
            { resource: 'x', privilege: 'mock-saved_object:c/create', authorized: true },
            { privilege: 'mock-saved_object:c/create', authorized: false }, // inverse fail-secure check
            { resource: 'x', privilege: 'mock-saved_object:c/update', authorized: true },
            { resource: 'x', privilege: 'login:', authorized: true },
            { resource: 'y', privilege: 'mock-saved_object:b/create', authorized: true },
            { resource: 'y', privilege: 'mock-saved_object:b/update', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:c/create', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:c/update', authorized: false },
            { privilege: 'mock-saved_object:c/update', authorized: true }, // fail-secure check
            { resource: 'y', privilege: 'mock-saved_object:c/update', authorized: true }, // fail-secure check
            { resource: 'y', privilege: 'login:', authorized: true },
            // The fail-secure checks are a contrived scenario, as we *shouldn't* get both an unauthorized and authorized result for a given resource...
            // However, in case we do, we should fail-secure (authorized + unauthorized = unauthorized)
          ],
        },
      } as CheckPrivilegesResponse);

      // Disable to test private method
      // eslint-disable-next-line dot-notation
      const result = await securityExtension['authorize']({ types, spaces, actions });
      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
      expect(auditLogger.log).not.toHaveBeenCalled(); // We're performing authz but no enforce, therefore no audit
      expect(result).toEqual({
        status: 'partially_authorized',
        typeMap: new Map()
          .set('a', {
            create: { isGloballyAuthorized: true, authorizedSpaces: [] },
            ['login:']: { authorizedSpaces: ['x', 'y'] },
          })
          .set('b', {
            create: { authorizedSpaces: ['x', 'y'] },
            ['login:']: { authorizedSpaces: ['x', 'y'] },
          })
          .set('c', {
            create: { authorizedSpaces: ['x'] },
            update: { authorizedSpaces: ['x'] },
            ['login:']: { authorizedSpaces: ['x', 'y'] },
          }),
      });
    });

    test('unauthorized', async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/create', authorized: false },
            { privilege: 'mock-saved_object:a/update', authorized: false },
            { privilege: 'mock-saved_object:a/update', authorized: true }, // fail-secure check
            { resource: 'x', privilege: 'mock-saved_object:b/create', authorized: false },
            { resource: 'x', privilege: 'mock-saved_object:b/update', authorized: false },
            { resource: 'x', privilege: 'mock-saved_object:c/create', authorized: false },
            { resource: 'x', privilege: 'mock-saved_object:c/update', authorized: false },
            { resource: 'x', privilege: 'login:', authorized: false },
            { resource: 'x', privilege: 'login:', authorized: true }, // fail-secure check
            { resource: 'y', privilege: 'mock-saved_object:a/create', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:a/update', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:b/create', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:b/update', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:c/create', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:c/update', authorized: false },
            { privilege: 'mock-saved_object:c/update', authorized: true }, // fail-secure check
            { resource: 'y', privilege: 'mock-saved_object:c/update', authorized: true }, // fail-secure check
            { resource: 'y', privilege: 'login:', authorized: true }, // should *not* result in a 'partially_authorized' status
            // The fail-secure checks are a contrived scenario, as we *shouldn't* get both an unauthorized and authorized result for a given resource...
            // However, in case we do, we should fail-secure (authorized + unauthorized = unauthorized)
          ],
        },
      } as CheckPrivilegesResponse);

      // Disable to test private method
      // eslint-disable-next-line dot-notation
      const result = await securityExtension['authorize']({ types, spaces, actions });
      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
      expect(auditLogger.log).not.toHaveBeenCalled(); // We're performing authz but no enforce, therefore no audit
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
            // redundant conflicting privileges for space X, type B, action Create
            { resource: 'x', privilege: 'mock-saved_object:b/create', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:b/create', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:b/create', authorized: true },
          ],
        },
      } as CheckPrivilegesResponse;

      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(conflictingPrivilegesResponse);

      // Disable to test private method
      // eslint-disable-next-line dot-notation
      const result = await securityExtension['authorize']({ types, spaces, actions });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: new Map().set('b', {
          create: { authorizedSpaces: ['y'] }, // should NOT be authorized for conflicted privilege
        }),
      });
    });
  });

  describe('with enforce', () => {
    // These arguments are used for all unit tests below
    const types = new Set(['a', 'b', 'c']);
    const spaces = new Set(['x', 'y']);
    const actions = new Set([SecurityAction.CREATE]);

    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/create', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/create', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:c/create', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/create', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:c/create', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    const partiallyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/create', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/create', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:c/create', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    const unauthorizedCheckPrivilegesResponse = {
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:a/create', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/create', authorized: true },
          { resource: 'z', privilege: 'mock-saved_object:c/create', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    describe(`fully authorized`, () => {
      test('adds default audit event', async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

        // Disable to test private method
        // eslint-disable-next-line dot-notation
        await securityExtension['authorize']({
          actions,
          types,
          spaces,
          enforceMap: new Map([
            ['a', new Set(['x', 'y', 'z'])],
            ['b', new Set(['x', 'y'])],
            ['c', new Set(['y'])],
          ]),
        });

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.CREATE,
            category: ['database'],
            outcome: 'unknown',
            type: ['creation'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: undefined,
          },
          message: 'User is creating saved objects',
        });
      });

      test(`adds audit event with success outcome when 'useSuccessOutcome' is true`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

        // Disable to test private method
        // eslint-disable-next-line dot-notation
        await securityExtension['authorize']({
          actions,
          types,
          spaces,
          enforceMap: new Map([
            ['a', new Set(['x', 'y', 'z'])],
            ['b', new Set(['x', 'y'])],
            ['c', new Set(['y'])],
          ]),
          auditOptions: { useSuccessOutcome: true },
        });

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.CREATE,
            category: ['database'],
            outcome: 'success',
            type: ['creation'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: undefined,
          },
          message: 'User has created saved objects',
        });
      });

      test(`adds audit event per object when 'objects' is populated`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

        const auditObjects = [
          { type: 'a', id: '1' },
          { type: 'b', id: '2' },
          { type: 'c', id: '3' },
        ];

        // Disable to test private method
        // eslint-disable-next-line dot-notation
        await securityExtension['authorize']({
          actions,
          types,
          spaces,
          enforceMap: new Map([
            ['a', new Set(['x', 'y', 'z'])],
            ['b', new Set(['x', 'y'])],
            ['c', new Set(['y'])],
          ]),
          auditOptions: {
            objects: auditObjects,
          },
        });

        expect(auditLogger.log).toHaveBeenCalledTimes(auditObjects.length);
        for (const obj of auditObjects) {
          expect(auditLogger.log).toHaveBeenCalledWith({
            error: undefined,
            event: {
              action: AuditAction.CREATE,
              category: ['database'],
              outcome: 'unknown',
              type: ['creation'],
            },
            kibana: {
              add_to_spaces: undefined,
              delete_from_spaces: undefined,
              saved_object: {
                id: obj.id,
                type: obj.type,
              },
            },
            message: `User is creating ${obj.type} [id=${obj.id}]`,
          });
        }
      });

      test(`adds audit event per object with success outcome when 'objects' is populated and 'useSuccessOutcome' is true`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

        const auditObjects = [
          { type: 'a', id: '1' },
          { type: 'b', id: '2' },
          { type: 'c', id: '3' },
        ];

        // Disable to test private method
        // eslint-disable-next-line dot-notation
        await securityExtension['authorize']({
          actions,
          types,
          spaces,
          enforceMap: new Map([
            ['a', new Set(['x', 'y', 'z'])],
            ['b', new Set(['x', 'y'])],
            ['c', new Set(['y'])],
          ]),
          auditOptions: {
            objects: auditObjects,
            useSuccessOutcome: true,
          },
        });

        expect(auditLogger.log).toHaveBeenCalledTimes(auditObjects.length);
        for (const obj of auditObjects) {
          expect(auditLogger.log).toHaveBeenCalledWith({
            error: undefined,
            event: {
              action: AuditAction.CREATE,
              category: ['database'],
              outcome: 'success',
              type: ['creation'],
            },
            kibana: {
              add_to_spaces: undefined,
              delete_from_spaces: undefined,
              saved_object: {
                id: obj.id,
                type: obj.type,
              },
            },
            message: `User has created ${obj.type} [id=${obj.id}]`,
          });
        }
      });

      test(`does not add audit events when 'bypassOnSuccess' is true`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

        const auditObjects = [
          { type: 'a', id: '1' },
          { type: 'b', id: '2' },
          { type: 'c', id: '3' },
        ];

        // Disable to test private method
        // eslint-disable-next-line dot-notation
        await securityExtension['authorize']({
          actions,
          types,
          spaces,
          enforceMap: new Map([
            ['a', new Set(['x', 'y', 'z'])],
            ['b', new Set(['x', 'y'])],
            ['c', new Set(['y'])],
          ]),
          auditOptions: {
            objects: auditObjects,
            bypassOnSuccess: true,
          },
        });

        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      test(`auditOptions.bypassOnFailure' has no effect`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

        // Disable to test private method
        // eslint-disable-next-line dot-notation
        await securityExtension['authorize']({
          actions,
          types,
          spaces,
          enforceMap: new Map([
            ['a', new Set(['x', 'y', 'z'])],
            ['b', new Set(['x', 'y'])],
            ['c', new Set(['y'])],
          ]),
          auditOptions: { bypassOnFailure: true },
        });

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.CREATE,
            category: ['database'],
            outcome: 'unknown',
            type: ['creation'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: undefined,
          },
          message: 'User is creating saved objects',
        });
      });
    });

    describe(`partially authorized`, () => {
      test('throws error and adds default audit event', async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse);

        await expect(() =>
          // Disable to test private method
          // eslint-disable-next-line dot-notation
          securityExtension['authorize']({
            actions,
            types,
            spaces,
            enforceMap: new Map([
              ['a', new Set(['x', 'y', 'z'])],
              ['b', new Set(['x', 'y'])],
              ['c', new Set(['x', 'y'])],
            ]),
          })
        ).rejects.toThrowError('Unable to create b,c');

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: {
            code: 'Error',
            message: 'Unable to create b,c',
          },
          event: {
            action: AuditAction.CREATE,
            category: ['database'],
            outcome: 'failure',
            type: ['creation'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: undefined,
          },
          message: 'Failed attempt to create saved objects',
        });
      });

      test(`throws error and adds audit event per object when 'objects' is populated`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse);

        const auditObjects = [
          { type: 'a', id: '1' },
          { type: 'b', id: '2' },
          { type: 'c', id: '3' },
        ];

        await expect(() =>
          // Disable to test private method
          // eslint-disable-next-line dot-notation
          securityExtension['authorize']({
            actions,
            types,
            spaces,
            enforceMap: new Map([
              ['a', new Set(['x', 'y', 'z'])],
              ['b', new Set(['x', 'y'])],
              ['c', new Set(['x', 'y'])],
            ]),
            auditOptions: { objects: auditObjects },
          })
        ).rejects.toThrowError('Unable to create b,c');

        expect(auditLogger.log).toHaveBeenCalledTimes(auditObjects.length);
        for (const obj of auditObjects) {
          expect(auditLogger.log).toHaveBeenCalledWith({
            error: {
              code: 'Error',
              message: 'Unable to create b,c',
            },
            event: {
              action: AuditAction.CREATE,
              category: ['database'],
              outcome: 'failure',
              type: ['creation'],
            },
            kibana: {
              add_to_spaces: undefined,
              delete_from_spaces: undefined,
              saved_object: {
                id: obj.id,
                type: obj.type,
              },
            },
            message: `Failed attempt to create ${obj.type} [id=${obj.id}]`,
          });
        }
      });

      test(`throws error and does not add an audit event when 'bypassOnFailure' is true`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse);

        const auditObjects = [
          { type: 'a', id: '1' },
          { type: 'b', id: '2' },
          { type: 'c', id: '3' },
        ];

        await expect(() =>
          // Disable to test private method
          // eslint-disable-next-line dot-notation
          securityExtension['authorize']({
            actions,
            types,
            spaces,
            enforceMap: new Map([
              ['a', new Set(['x', 'y', 'z'])],
              ['b', new Set(['x', 'y'])],
              ['c', new Set(['x', 'y'])],
            ]),
            auditOptions: { objects: auditObjects, bypassOnFailure: true },
          })
        ).rejects.toThrowError('Unable to create b,c');

        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      test(`auditOptions.bypassOnSuccess' has no effect`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse);

        await expect(() =>
          // Disable to test private method
          // eslint-disable-next-line dot-notation
          securityExtension['authorize']({
            actions,
            types,
            spaces,
            enforceMap: new Map([
              ['a', new Set(['x', 'y', 'z'])],
              ['b', new Set(['x', 'y'])],
              ['c', new Set(['x', 'y'])],
            ]),
            auditOptions: { bypassOnSuccess: true },
          })
        ).rejects.toThrowError('Unable to create b,c');

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: {
            code: 'Error',
            message: 'Unable to create b,c',
          },
          event: {
            action: AuditAction.CREATE,
            category: ['database'],
            outcome: 'failure',
            type: ['creation'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: undefined,
          },
          message: 'Failed attempt to create saved objects',
        });
      });
    });

    describe(`unauthorized`, () => {
      test('throws error and adds default audit event', async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(unauthorizedCheckPrivilegesResponse);

        await expect(() =>
          // Disable to test private method
          // eslint-disable-next-line dot-notation
          securityExtension['authorize']({
            actions,
            types,
            spaces,
            enforceMap: new Map([
              ['a', new Set(['y', 'z'])],
              ['b', new Set(['x', 'z'])],
              ['c', new Set(['x', 'y'])],
            ]),
          })
        ).rejects.toThrowError('Unable to create a,b,c');

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: {
            code: 'Error',
            message: 'Unable to create a,b,c',
          },
          event: {
            action: AuditAction.CREATE,
            category: ['database'],
            outcome: 'failure',
            type: ['creation'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: undefined,
          },
          message: 'Failed attempt to create saved objects',
        });
      });

      test(`throws error and adds audit event per object when 'objects' is populated`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(unauthorizedCheckPrivilegesResponse);

        const auditObjects = [
          { type: 'a', id: '1' },
          { type: 'b', id: '2' },
          { type: 'c', id: '3' },
        ];

        await expect(() =>
          // Disable to test private method
          // eslint-disable-next-line dot-notation
          securityExtension['authorize']({
            actions,
            types,
            spaces,
            enforceMap: new Map([
              ['a', new Set(['x', 'y', 'z'])],
              ['b', new Set(['x', 'y'])],
              ['c', new Set(['x', 'y'])],
            ]),
            auditOptions: { objects: auditObjects },
          })
        ).rejects.toThrowError('Unable to create a,b,c');

        expect(auditLogger.log).toHaveBeenCalledTimes(auditObjects.length);
        for (const obj of auditObjects) {
          expect(auditLogger.log).toHaveBeenCalledWith({
            error: {
              code: 'Error',
              message: 'Unable to create a,b,c',
            },
            event: {
              action: AuditAction.CREATE,
              category: ['database'],
              outcome: 'failure',
              type: ['creation'],
            },
            kibana: {
              add_to_spaces: undefined,
              delete_from_spaces: undefined,
              saved_object: {
                id: obj.id,
                type: obj.type,
              },
            },
            message: `Failed attempt to create ${obj.type} [id=${obj.id}]`,
          });
        }
      });

      test(`throws error and does not add an audit event when 'bypassOnFailure' is true`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(unauthorizedCheckPrivilegesResponse);

        const auditObjects = [
          { type: 'a', id: '1' },
          { type: 'b', id: '2' },
          { type: 'c', id: '3' },
        ];

        await expect(() =>
          // Disable to test private method
          // eslint-disable-next-line dot-notation
          securityExtension['authorize']({
            actions,
            types,
            spaces,
            enforceMap: new Map([
              ['a', new Set(['x', 'y', 'z'])],
              ['b', new Set(['x', 'y'])],
              ['c', new Set(['x', 'y'])],
            ]),
            auditOptions: { objects: auditObjects, bypassOnFailure: true },
          })
        ).rejects.toThrowError('Unable to create a,b,c');

        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      test(`auditOptions.bypassOnSuccess' has no effect`, async () => {
        const { securityExtension, checkPrivileges, auditLogger } = setup();
        checkPrivileges.mockResolvedValue(unauthorizedCheckPrivilegesResponse);

        await expect(() =>
          // Disable to test private method
          // eslint-disable-next-line dot-notation
          securityExtension['authorize']({
            actions,
            types,
            spaces,
            enforceMap: new Map([
              ['a', new Set(['y', 'z'])],
              ['b', new Set(['x', 'z'])],
              ['c', new Set(['x', 'y'])],
            ]),
            auditOptions: { bypassOnSuccess: true },
          })
        ).rejects.toThrowError('Unable to create a,b,c');

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: {
            code: 'Error',
            message: 'Unable to create a,b,c',
          },
          event: {
            action: AuditAction.CREATE,
            category: ['database'],
            outcome: 'failure',
            type: ['creation'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: undefined,
          },
          message: 'Failed attempt to create saved objects',
        });
      });
    });
  });

  describe('security actions with no authorization action', () => {
    // These arguments are used for all unit tests below
    const types = new Set(['a', 'b', 'c']);
    const spaces = new Set(['x', 'y']);

    test('does not check authorization', async () => {
      const { securityExtension, checkPrivileges } = setup();

      // Disable to test private method
      // eslint-disable-next-line dot-notation
      await securityExtension['authorize']({
        types,
        spaces,
        actions: new Set([SecurityAction.CLOSE_POINT_IN_TIME]), // this is currently the only security action that does not require authz
      });
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('adds an audit event by default', async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();

      // Disable to test private method
      // eslint-disable-next-line dot-notation
      securityExtension['authorize']({
        types,
        spaces,
        actions: new Set([SecurityAction.CLOSE_POINT_IN_TIME]), // this is currently the only security action that does not require authz
      });
      expect(checkPrivileges).not.toHaveBeenCalled();
      expect(auditLogger.log).toBeCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: undefined,
        event: {
          action: AuditAction.CLOSE_POINT_IN_TIME,
          category: ['database'],
          outcome: 'unknown',
          type: ['deletion'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          saved_object: undefined,
        },
        message: 'User is closing point-in-time saved objects',
      });
    });

    test(`adds an audit event with success outcome when 'useSuccessOutcome' is true`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();

      // Disable to test private method
      // eslint-disable-next-line dot-notation
      await securityExtension['authorize']({
        types,
        spaces,
        actions: new Set([SecurityAction.CLOSE_POINT_IN_TIME]), // this is currently the only security action that does not require authz
        auditOptions: { useSuccessOutcome: true },
      });
      expect(checkPrivileges).not.toHaveBeenCalled();
      expect(auditLogger.log).toBeCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: undefined,
        event: {
          action: AuditAction.CLOSE_POINT_IN_TIME,
          category: ['database'],
          outcome: 'success',
          type: ['deletion'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          saved_object: undefined,
        },
        message: 'User has closed point-in-time saved objects',
      });
    });

    test(`adds an audit event per object when 'objects' is populated`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();

      const auditObjects = [
        { type: 'a', id: '1' },
        { type: 'b', id: '2' },
        { type: 'c', id: '3' },
      ];

      // Disable to test private method
      // eslint-disable-next-line dot-notation
      await securityExtension['authorize']({
        types,
        spaces,
        actions: new Set([SecurityAction.CLOSE_POINT_IN_TIME]), // this is currently the only security action that does not require authz
        auditOptions: { objects: auditObjects },
      });
      expect(checkPrivileges).not.toHaveBeenCalled();
      expect(auditLogger.log).toBeCalledTimes(3);
      for (const obj of auditObjects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.CLOSE_POINT_IN_TIME,
            category: ['database'],
            outcome: 'unknown',
            type: ['deletion'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: {
              id: obj.id,
              type: obj.type,
            },
          },
          message: `User is closing point-in-time ${obj.type} [id=${obj.id}]`,
        });
      }
    });

    test(`adds an audit event per object with success outcome when 'objects' is populated and 'useSuccessOutcome' is true`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();

      // Disable to test private method
      // eslint-disable-next-line dot-notation
      await securityExtension['authorize']({
        types,
        spaces,
        actions: new Set([SecurityAction.CLOSE_POINT_IN_TIME]), // this is currently the only security action that does not require authz
        auditOptions: { useSuccessOutcome: true },
      });
      expect(checkPrivileges).not.toHaveBeenCalled();
      expect(auditLogger.log).toBeCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: undefined,
        event: {
          action: AuditAction.CLOSE_POINT_IN_TIME,
          category: ['database'],
          outcome: 'success',
          type: ['deletion'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          saved_object: undefined,
        },
        message: 'User has closed point-in-time saved objects',
      });
    });

    test(`does not add an audit event when 'bypassOnSuccess' is true`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();

      const auditObjects = [
        { type: 'a', id: '1' },
        { type: 'b', id: '2' },
        { type: 'c', id: '3' },
      ];

      // Disable to test private method
      // eslint-disable-next-line dot-notation
      await securityExtension['authorize']({
        types,
        spaces,
        actions: new Set([SecurityAction.CLOSE_POINT_IN_TIME]), // this is currently the only security action that does not require authz
        auditOptions: { objects: auditObjects, bypassOnSuccess: true },
      });
      expect(checkPrivileges).not.toHaveBeenCalled();
      expect(auditLogger.log).not.toHaveBeenCalled();
    });
  });

  describe('scecurity actions with no audit action', () => {
    // These arguments are used for all unit tests below
    const types = new Set(['a', 'b', 'c']);
    const spaces = new Set(['x', 'y']);
    // Check conflicts is currently the only security action without an audit action
    const actions = new Set([SecurityAction.CHECK_CONFLICTS]);
    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_create', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/bulk_create', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/bulk_create', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    const partiallyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_create', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/bulk_create', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    const unauthorizedCheckPrivilegesResponse = {
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:a/bulk_create', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/bulk_create', authorized: true },
          { resource: 'z', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    test(`does not add audit events when fully authorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      const auditObjects = [
        { type: 'a', id: '1' },
        { type: 'b', id: '2' },
        { type: 'c', id: '3' },
      ];

      // Disable to test private method
      // eslint-disable-next-line dot-notation
      await securityExtension['authorize']({
        actions,
        types,
        spaces,
        enforceMap: new Map([
          ['a', new Set(['x', 'y', 'z'])],
          ['b', new Set(['x', 'y'])],
          ['c', new Set(['y'])],
        ]),
        auditOptions: {
          objects: auditObjects,
        },
      });

      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    test(`does not add audit events when partially authorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse);

      const auditObjects = [
        { type: 'a', id: '1' },
        { type: 'b', id: '2' },
        { type: 'c', id: '3' },
      ];

      await expect(
        // Disable to test private method
        // eslint-disable-next-line dot-notation
        securityExtension['authorize']({
          actions,
          types,
          spaces,
          enforceMap: new Map([
            ['a', new Set(['x', 'y', 'z'])],
            ['b', new Set(['x', 'y'])],
            ['c', new Set(['x', 'y'])],
          ]),
          auditOptions: {
            objects: auditObjects,
          },
        })
      ).rejects.toThrowError('Unable to bulk_create b,c');

      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    test(`does not add audit events when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(unauthorizedCheckPrivilegesResponse);

      const auditObjects = [
        { type: 'a', id: '1' },
        { type: 'b', id: '2' },
        { type: 'c', id: '3' },
      ];

      await expect(
        // Disable to test private method
        // eslint-disable-next-line dot-notation
        securityExtension['authorize']({
          actions,
          types,
          spaces,
          enforceMap: new Map([
            ['a', new Set(['y', 'z'])],
            ['b', new Set(['x', 'z'])],
            ['c', new Set(['x', 'y'])],
          ]),
          auditOptions: {
            objects: auditObjects,
          },
        })
      ).rejects.toThrowError('Unable to bulk_create a,b,c');

      expect(auditLogger.log).not.toHaveBeenCalled();
    });
  });
});

describe.skip('#addAuditEvent (private)', () => {
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

    // Disable to test private method
    // eslint-disable-next-line dot-notation
    securityExtension['addAuditEvent'](auditParams);

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

    // Disable to test private method
    // eslint-disable-next-line dot-notation
    securityExtension['addAuditEvent'](auditParams);

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

    // Disable to test private method
    // eslint-disable-next-line dot-notation
    securityExtension['addAuditEvent'](auditParams);

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

describe('#create', () => {
  const namespace = 'x';

  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  describe(`#authorizeCreate`, () => {
    const actionString = 'create';

    test('throws an error when `namespace` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      await expect(
        securityExtension.authorizeCreate({
          namespace: '',
          object: obj1,
        })
      ).rejects.toThrowError('namespace cannot be an empty string');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.authorizeCreate({ namespace, object: obj1 })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls internal authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      await securityExtension.authorizeCreate({
        namespace,
        object: obj1,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      const expectedActions = new Set([SecurityAction.CREATE]);
      const expectedSpaces = new Set([namespace, ...obj1.initialNamespaces!]);
      const expectedTypes = new Set([obj1.type]);
      const expectedEnforceMap = new Map<string, Set<string>>();
      expectedEnforceMap.set(obj1.type, new Set([namespace, ...obj1.initialNamespaces!]));
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        options: { allowGlobalResource: true },
        auditOptions: {
          objects: [obj1],
        },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: true },
      });
      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [`mock-saved_object:${obj1.type}/${actionString}`, 'login:'],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
        action: SecurityAction.CREATE,
        typesAndSpaces: expectedEnforceMap,
        typeMap: new Map().set(obj1.type, {
          create: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
        auditOptions: { objects: [obj1] },
      });
    });

    test(`returns result when successful`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      const result = await securityExtension.authorizeCreate({
        namespace,
        object: obj1,
      });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: new Map().set(obj1.type, {
          create: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds a single audit event when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      await securityExtension.authorizeCreate({
        namespace,
        object: obj1,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: undefined,
        event: {
          action: AuditAction.CREATE,
          category: ['database'],
          outcome: 'unknown',
          type: ['creation'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          saved_object: { type: obj1.type, id: obj1.id },
        },
        message: `User is creating ${obj1.type} [id=${obj1.id}]`,
      });
    });

    test(`throws when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeCreate({
          namespace,
          object: obj1,
        })
      ).rejects.toThrow(`Unable to create ${obj1.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds a single audit event when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeCreate({
          namespace,
          object: obj1,
        })
      ).rejects.toThrow(`Unable to create ${obj1.type}`);

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: 'Unable to create a',
        },
        event: {
          action: AuditAction.CREATE,
          category: ['database'],
          outcome: 'failure',
          type: ['creation'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          saved_object: { type: obj1.type, id: obj1.id },
        },
        message: `Failed attempt to create ${obj1.type} [id=${obj1.id}]`,
      });
    });
  });

  describe(`#authorizeBulkCreate`, () => {
    const actionString = 'bulk_create';
    const objects = [obj1, obj2, obj3, obj4];

    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_create', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/bulk_create', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:d/bulk_create', authorized: true },
          { resource: 'bar', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:d/bulk_create', authorized: true },
          { resource: 'z', privilege: 'mock-saved_object:d/bulk_create', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    const expectedTypes = new Set(objects.map((obj) => obj.type));

    const expectedActions = new Set([SecurityAction.BULK_CREATE]);
    const expectedSpaces = new Set([
      namespace,
      ...obj1.initialNamespaces!,
      ...obj3.existingNamespaces!,
      ...obj4.initialNamespaces!,
      ...obj4.existingNamespaces!,
    ]);

    const expectedEnforceMap = new Map([
      [obj1.type, new Set([namespace, ...obj1.initialNamespaces!])],
      [obj2.type, new Set([namespace])],
      [obj3.type, new Set([namespace])],
      [obj4.type, new Set([namespace, ...obj4.initialNamespaces!])],
    ]);

    const expectedTypeMap = new Map()
      .set('a', {
        bulk_create: { isGloballyAuthorized: true, authorizedSpaces: [] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('b', {
        bulk_create: { authorizedSpaces: ['x'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('c', {
        bulk_create: { authorizedSpaces: ['x', 'bar'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('d', {
        bulk_create: { authorizedSpaces: ['x', 'y', 'z'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      });

    test('throws an error when `objects` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      const emptyObjects: AuthorizeCreateObject[] = [];

      await expect(
        securityExtension.authorizeBulkCreate({
          namespace,
          objects: emptyObjects,
        })
      ).rejects.toThrowError('No objects specified for bulk_create authorization');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when `namespace` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeBulkCreate({
          namespace: '',
          objects: [obj1, obj2],
        })
      ).rejects.toThrowError('namespace cannot be an empty string');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.authorizeBulkCreate({ namespace, objects: [obj1] })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls internal authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      await securityExtension.authorizeBulkCreate({
        namespace,
        objects,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        options: { allowGlobalResource: true },
        auditOptions: {
          objects,
        },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: true },
      });

      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [
          `mock-saved_object:${obj1.type}/${actionString}`,
          `mock-saved_object:${obj2.type}/${actionString}`,
          `mock-saved_object:${obj3.type}/${actionString}`,
          `mock-saved_object:${obj4.type}/${actionString}`,
          'login:',
        ],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
        action: SecurityAction.BULK_CREATE,
        typesAndSpaces: expectedEnforceMap,
        typeMap: expectedTypeMap,
        auditOptions: { objects },
      });
    });

    test(`returns result when fully authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      const result = await securityExtension.authorizeBulkCreate({
        namespace,
        objects,
      });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: expectedTypeMap,
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`returns result when partially authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/bulk_create', authorized: true },
            { privilege: 'login:', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:b/bulk_create', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:d/bulk_create', authorized: true },
            { resource: 'bar', privilege: 'mock-saved_object:c/bulk_create', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:d/bulk_create', authorized: true },
            { resource: 'z', privilege: 'mock-saved_object:d/bulk_create', authorized: false },
          ],
        },
      } as CheckPrivilegesResponse);

      const result = await securityExtension.authorizeBulkCreate({
        namespace,
        objects,
      });
      expect(result).toEqual({
        status: 'partially_authorized',
        typeMap: new Map()
          .set(obj1.type, {
            bulk_create: { isGloballyAuthorized: true, authorizedSpaces: [] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(obj2.type, {
            bulk_create: { authorizedSpaces: ['x'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(obj3.type, {
            bulk_create: { authorizedSpaces: ['x'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(obj4.type, {
            bulk_create: { authorizedSpaces: ['x', 'y'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          }),
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds an audit event per object when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await securityExtension.authorizeBulkCreate({
        namespace,
        objects,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.CREATE,
            category: ['database'],
            outcome: 'unknown',
            type: ['creation'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: { type: obj.type, id: obj.id },
          },
          message: `User is creating ${obj.type} [id=${obj.id}]`,
        });
      }
    });

    test(`throws when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/bulk_create', authorized: true },
            { privilege: 'login:', authorized: true },
          ],
        },
      } as CheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeBulkCreate({
          namespace,
          objects,
        })
      ).rejects.toThrow(`Unable to bulk_create ${obj2.type},${obj3.type},${obj4.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds an audit event per object when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/create', authorized: false },
            { privilege: 'login:', authorized: true },
          ],
        },
      } as CheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeBulkCreate({
          namespace,
          objects,
        })
      ).rejects.toThrow(
        `Unable to bulk_create ${obj1.type},${obj2.type},${obj3.type},${obj4.type}`
      );
      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: {
            code: 'Error',
            message: `Unable to bulk_create ${obj1.type},${obj2.type},${obj3.type},${obj4.type}`,
          },
          event: {
            action: AuditAction.CREATE,
            category: ['database'],
            outcome: 'failure',
            type: ['creation'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: { type: obj.type, id: obj.id },
          },
          message: `Failed attempt to create ${obj.type} [id=${obj.id}]`,
        });
      }
    });
  });
});

describe('update', () => {
  const namespace = 'x';

  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  describe(`#authorizeUpdate`, () => {
    const actionString = 'update';

    test('throws an error when `namespace` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      await expect(
        securityExtension.authorizeUpdate({
          namespace: '',
          object: obj2,
        })
      ).rejects.toThrowError('namespace cannot be an empty string');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.authorizeUpdate({ namespace, object: obj1 })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls internal authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      await securityExtension.authorizeUpdate({
        namespace,
        object: obj1,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      const expectedActions = new Set([SecurityAction.UPDATE]);
      const expectedSpaces = new Set([namespace, obj1.objectNamespace!]);
      const expectedTypes = new Set([obj1.type]);
      const expectedEnforceMap = new Map<string, Set<string>>();
      expectedEnforceMap.set(obj1.type, new Set([namespace, obj1.objectNamespace!]));
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        auditOptions: {
          objects: [obj1],
        },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });
      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [`mock-saved_object:${obj1.type}/${actionString}`, 'login:'],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
        action: SecurityAction.UPDATE,
        typesAndSpaces: expectedEnforceMap,
        typeMap: new Map().set(obj1.type, {
          update: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
        auditOptions: { objects: [obj1] },
      });
    });

    test(`returns result when successful`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      const result = await securityExtension.authorizeUpdate({
        namespace,
        object: obj1,
      });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: new Map().set(obj1.type, {
          update: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds a single audit event when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      await securityExtension.authorizeUpdate({
        namespace,
        object: obj1,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: undefined,
        event: {
          action: AuditAction.UPDATE,
          category: ['database'],
          outcome: 'unknown',
          type: ['change'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          saved_object: { type: obj1.type, id: obj1.id },
        },
        message: `User is updating ${obj1.type} [id=${obj1.id}]`,
      });
    });

    test(`throws when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeUpdate({
          namespace,
          object: obj1,
        })
      ).rejects.toThrow(`Unable to update ${obj1.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds a single audit event when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeUpdate({
          namespace,
          object: obj1,
        })
      ).rejects.toThrow(`Unable to update ${obj1.type}`);

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: 'Unable to update a',
        },
        event: {
          action: AuditAction.UPDATE,
          category: ['database'],
          outcome: 'failure',
          type: ['change'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          saved_object: { type: obj1.type, id: obj1.id },
        },
        message: `Failed attempt to update ${obj1.type} [id=${obj1.id}]`,
      });
    });
  });

  describe(`#authorizeBulkUpdate`, () => {
    const actionString = 'bulk_update';
    const objects = [obj1, obj2, obj3, obj4];
    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_update', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/bulk_update', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:c/bulk_update', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:d/bulk_update', authorized: true },
          { resource: 'bar', privilege: 'mock-saved_object:c/bulk_update', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:d/bulk_update', authorized: true },
          { resource: 'z', privilege: 'mock-saved_object:d/bulk_update', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    const expectedTypes = new Set(objects.map((obj) => obj.type));

    const expectedActions = new Set([SecurityAction.BULK_UPDATE]);
    const expectedSpaces = new Set([
      namespace,
      obj1.objectNamespace!,
      ...obj3.existingNamespaces!,
      obj4.objectNamespace!,
      ...obj4.existingNamespaces!,
    ]);

    const expectedEnforceMap = new Map([
      [obj1.type, new Set([namespace, obj1.objectNamespace!])],
      [obj2.type, new Set([namespace])],
      [obj3.type, new Set([namespace])],
      [obj4.type, new Set([namespace, obj4.objectNamespace!])],
    ]);

    const expectedTypeMap = new Map()
      .set('a', {
        bulk_update: { isGloballyAuthorized: true, authorizedSpaces: [] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('b', {
        bulk_update: { authorizedSpaces: ['x'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('c', {
        bulk_update: { authorizedSpaces: ['x', 'bar'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('d', {
        bulk_update: { authorizedSpaces: ['x', 'y', 'z'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      });

    test('throws an error when `objects` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      const emptyObjects: AuthorizeUpdateObject[] = [];

      await expect(
        securityExtension.authorizeBulkUpdate({
          namespace,
          objects: emptyObjects,
        })
      ).rejects.toThrowError('No objects specified for bulk_update authorization');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when `namespace` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeBulkUpdate({
          namespace: '',
          objects: [obj1, obj2],
        })
      ).rejects.toThrowError('namespace cannot be an empty string');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.authorizeBulkUpdate({ namespace, objects: [obj1] })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      await securityExtension.authorizeBulkUpdate({
        namespace,
        objects,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        auditOptions: {
          objects,
        },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });

      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [
          `mock-saved_object:${obj1.type}/${actionString}`,
          `mock-saved_object:${obj2.type}/${actionString}`,
          `mock-saved_object:${obj3.type}/${actionString}`,
          `mock-saved_object:${obj4.type}/${actionString}`,
          'login:',
        ],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
        action: SecurityAction.BULK_UPDATE,
        typesAndSpaces: expectedEnforceMap,
        typeMap: expectedTypeMap,
        auditOptions: { objects },
      });
    });

    test(`returns result when fully authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      const result = await securityExtension.authorizeBulkUpdate({
        namespace,
        objects,
      });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: expectedTypeMap,
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`returns result when partially authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/bulk_update', authorized: true },
            { privilege: 'login:', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:b/bulk_update', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:c/bulk_update', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:d/bulk_update', authorized: true },
            { resource: 'bar', privilege: 'mock-saved_object:c/bulk_update', authorized: false },
            { resource: 'y', privilege: 'mock-saved_object:d/bulk_update', authorized: true },
            { resource: 'z', privilege: 'mock-saved_object:d/bulk_update', authorized: false },
          ],
        },
      } as CheckPrivilegesResponse);

      const result = await securityExtension.authorizeBulkUpdate({
        namespace,
        objects,
      });
      expect(result).toEqual({
        status: 'partially_authorized',
        typeMap: new Map()
          .set(obj1.type, {
            bulk_update: { isGloballyAuthorized: true, authorizedSpaces: [] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(obj2.type, {
            bulk_update: { authorizedSpaces: ['x'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(obj3.type, {
            bulk_update: { authorizedSpaces: ['x'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(obj4.type, {
            bulk_update: { authorizedSpaces: ['x', 'y'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          }),
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds an audit event per object when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await securityExtension.authorizeBulkUpdate({
        namespace,
        objects,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.UPDATE,
            category: ['database'],
            outcome: 'unknown',
            type: ['change'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: { type: obj.type, id: obj.id },
          },
          message: `User is updating ${obj.type} [id=${obj.id}]`,
        });
      }
    });

    test(`throws when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/bulk_update', authorized: true },
            { privilege: 'login:', authorized: true },
          ],
        },
      } as CheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeBulkUpdate({
          namespace,
          objects,
        })
      ).rejects.toThrow(`Unable to bulk_update ${obj2.type},${obj3.type},${obj4.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds an audit event per object when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeBulkUpdate({
          namespace,
          objects,
        })
      ).rejects.toThrow(
        `Unable to bulk_update ${obj1.type},${obj2.type},${obj3.type},${obj4.type}`
      );
      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: {
            code: 'Error',
            message: `Unable to bulk_update ${obj1.type},${obj2.type},${obj3.type},${obj4.type}`,
          },
          event: {
            action: AuditAction.UPDATE,
            category: ['database'],
            outcome: 'failure',
            type: ['change'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: { type: obj.type, id: obj.id },
          },
          message: `Failed attempt to update ${obj.type} [id=${obj.id}]`,
        });
      }
    });
  });
});

describe('delete', () => {
  const namespace = 'x';

  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  describe(`#authorizeDelete`, () => {
    const actionString = 'delete';

    test('throws an error when `namespace` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      await expect(
        securityExtension.authorizeDelete({
          namespace: '',
          object: obj1,
        })
      ).rejects.toThrowError('namespace cannot be an empty string');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.authorizeDelete({ namespace, object: obj1 })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls internal authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj3.type, actionString, true);

      await securityExtension.authorizeDelete({
        namespace,
        object: obj3,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      const expectedActions = new Set([SecurityAction.DELETE]);
      const expectedSpaces = new Set([namespace]);
      const expectedTypes = new Set([obj3.type]);
      const expectedEnforceMap = new Map<string, Set<string>>();
      expectedEnforceMap.set(obj3.type, new Set([namespace])); // obj3.existingNamespaces should NOT be included
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        auditOptions: {
          objects: [{ ...obj3, existingNamespaces: undefined }],
        },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });
      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [`mock-saved_object:${obj3.type}/${actionString}`, 'login:'],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
        action: SecurityAction.DELETE,
        typesAndSpaces: expectedEnforceMap,
        typeMap: new Map().set(obj3.type, {
          delete: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
        auditOptions: {
          objects: [{ ...obj3, existingNamespaces: undefined }],
        },
      });
    });

    test(`returns result when successful`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      const result = await securityExtension.authorizeDelete({
        namespace,
        object: obj1,
      });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: new Map().set(obj1.type, {
          delete: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds a single audit event when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      await securityExtension.authorizeDelete({
        namespace,
        object: obj1,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: undefined,
        event: {
          action: AuditAction.DELETE,
          category: ['database'],
          outcome: 'unknown',
          type: ['deletion'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          saved_object: { type: obj1.type, id: obj1.id },
        },
        message: `User is deleting ${obj1.type} [id=${obj1.id}]`,
      });
    });

    test(`throws when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeDelete({
          namespace,
          object: obj1,
        })
      ).rejects.toThrow(`Unable to delete ${obj1.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds a single audit event when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeDelete({
          namespace,
          object: obj1,
        })
      ).rejects.toThrow(`Unable to delete ${obj1.type}`);

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: 'Unable to delete a',
        },
        event: {
          action: AuditAction.DELETE,
          category: ['database'],
          outcome: 'failure',
          type: ['deletion'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          saved_object: { type: obj1.type, id: obj1.id },
        },
        message: `Failed attempt to delete ${obj1.type} [id=${obj1.id}]`,
      });
    });
  });

  describe(`#authorizeBulkDelete`, () => {
    const actionString = 'bulk_delete';
    const objects = [obj1, obj2, obj3, obj4];
    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_delete', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/bulk_delete', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:c/bulk_delete', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:d/bulk_delete', authorized: true },
          { resource: 'bar', privilege: 'mock-saved_object:c/bulk_delete', authorized: true },
          { resource: 'z', privilege: 'mock-saved_object:d/bulk_delete', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    const expectedTypes = new Set(objects.map((obj) => obj.type));

    const expectedActions = new Set([SecurityAction.BULK_DELETE]);
    const expectedSpaces = new Set([
      namespace,
      ...obj3.existingNamespaces!,
      ...obj4.existingNamespaces!,
    ]);

    const expectedEnforceMap = new Map([
      [obj1.type, new Set([namespace])],
      [obj2.type, new Set([namespace])],
      [obj3.type, new Set([namespace])],
      [obj4.type, new Set([namespace])],
    ]);

    const expectedTypeMap = new Map()
      .set('a', {
        bulk_delete: { isGloballyAuthorized: true, authorizedSpaces: [] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('b', {
        bulk_delete: { authorizedSpaces: ['x'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('c', {
        bulk_delete: { authorizedSpaces: ['x', 'bar'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('d', {
        bulk_delete: { authorizedSpaces: ['x', 'z'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      });

    test('throws an error when `objects` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      const emptyObjects: AuthorizeObjectWithExistingSpaces[] = [];

      await expect(
        securityExtension.authorizeBulkDelete({
          namespace,
          objects: emptyObjects,
        })
      ).rejects.toThrowError('No objects specified for bulk_delete authorization');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when `namespace` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeBulkDelete({
          namespace: '',
          objects,
        })
      ).rejects.toThrowError('namespace cannot be an empty string');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.authorizeBulkDelete({ namespace, objects })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      await securityExtension.authorizeBulkDelete({
        namespace,
        objects,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        auditOptions: {
          objects,
        },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });

      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [
          `mock-saved_object:${obj1.type}/${actionString}`,
          `mock-saved_object:${obj2.type}/${actionString}`,
          `mock-saved_object:${obj3.type}/${actionString}`,
          `mock-saved_object:${obj4.type}/${actionString}`,
          'login:',
        ],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
        action: SecurityAction.BULK_DELETE,
        typesAndSpaces: expectedEnforceMap,
        typeMap: expectedTypeMap,
        auditOptions: { objects },
      });
    });

    test(`returns result when fully authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      const result = await securityExtension.authorizeBulkDelete({
        namespace,
        objects,
      });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: expectedTypeMap,
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`returns result when partially authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/bulk_delete', authorized: true },
            { privilege: 'login:', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:b/bulk_delete', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:c/bulk_delete', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:d/bulk_delete', authorized: true },
            { resource: 'bar', privilege: 'mock-saved_object:c/bulk_delete', authorized: false },
            { resource: 'z', privilege: 'mock-saved_object:d/bulk_delete', authorized: false },
          ],
        },
      } as CheckPrivilegesResponse);

      const result = await securityExtension.authorizeBulkDelete({
        namespace,
        objects,
      });
      expect(result).toEqual({
        status: 'partially_authorized',
        typeMap: new Map()
          .set(obj1.type, {
            bulk_delete: { isGloballyAuthorized: true, authorizedSpaces: [] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(obj2.type, {
            bulk_delete: { authorizedSpaces: ['x'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(obj3.type, {
            bulk_delete: { authorizedSpaces: ['x'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(obj4.type, {
            bulk_delete: { authorizedSpaces: ['x'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          }),
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds an audit event per object when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await securityExtension.authorizeBulkDelete({
        namespace,
        objects,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.DELETE,
            category: ['database'],
            outcome: 'unknown',
            type: ['deletion'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: { type: obj.type, id: obj.id },
          },
          message: `User is deleting ${obj.type} [id=${obj.id}]`,
        });
      }
    });

    test(`throws when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/bulk_delete', authorized: true },
            { privilege: 'login:', authorized: true },
          ],
        },
      } as CheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeBulkDelete({
          namespace,
          objects,
        })
      ).rejects.toThrow(`Unable to bulk_delete ${obj2.type},${obj3.type},${obj4.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds an audit event per object when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'bulk_delete', false);

      await expect(
        securityExtension.authorizeBulkDelete({
          namespace,
          objects,
        })
      ).rejects.toThrow(
        `Unable to bulk_delete ${obj1.type},${obj2.type},${obj3.type},${obj4.type}`
      );
      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: {
            code: 'Error',
            message: `Unable to bulk_delete ${obj1.type},${obj2.type},${obj3.type},${obj4.type}`,
          },
          event: {
            action: AuditAction.DELETE,
            category: ['database'],
            outcome: 'failure',
            type: ['deletion'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: { type: obj.type, id: obj.id },
          },
          message: `Failed attempt to delete ${obj.type} [id=${obj.id}]`,
        });
      }
    });
  });
});

describe('get', () => {
  const namespace = 'x';

  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  describe(`#authorizeGet`, () => {
    const actionString = 'get';

    test('throws an error when `namespace` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      await expect(
        securityExtension.authorizeGet({
          namespace: '',
          object: obj1,
        })
      ).rejects.toThrowError('namespace cannot be an empty string');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.authorizeGet({ namespace, object: obj1 })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls internal authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj3.type, actionString, true);

      await securityExtension.authorizeGet({
        namespace,
        object: obj3,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      const expectedActions = new Set([SecurityAction.GET]);
      const expectedSpaces = new Set([namespace, ...obj3.existingNamespaces]);
      const expectedTypes = new Set([obj3.type]);
      const expectedEnforceMap = new Map<string, Set<string>>();
      expectedEnforceMap.set(obj3.type, new Set([namespace])); // obj3.existingNamespaces should NOT be included
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        auditOptions: {
          bypassOnSuccess: undefined,
          objects: [obj3],
        },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });
      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [`mock-saved_object:${obj3.type}/${actionString}`, 'login:'],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
        action: SecurityAction.GET,
        typesAndSpaces: expectedEnforceMap,
        typeMap: new Map().set(obj3.type, {
          get: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
        auditOptions: {
          bypassOnSuccess: undefined,
          objects: [obj3],
        },
      });
    });

    test(`returns result when partially authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/get', authorized: true },
            { privilege: 'login:', authorized: true },
          ],
        },
      } as CheckPrivilegesResponse);
      // setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      const result = await securityExtension.authorizeGet({
        namespace,
        object: obj1,
      });
      expect(result).toEqual({
        status: 'partially_authorized',
        typeMap: new Map().set(obj1.type, {
          get: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`returns result when fully authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      const result = await securityExtension.authorizeGet({
        namespace,
        object: obj1,
      });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: new Map().set(obj1.type, {
          get: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds a single audit event when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      await securityExtension.authorizeGet({
        namespace,
        object: obj1,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: undefined,
        event: {
          action: AuditAction.GET,
          category: ['database'],
          outcome: 'unknown',
          type: ['access'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          saved_object: { type: obj1.type, id: obj1.id },
        },
        message: `User is accessing ${obj1.type} [id=${obj1.id}]`,
      });
    });

    test(`does not add an audit event when successful if object is not found`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, true);

      await securityExtension.authorizeGet({
        namespace,
        object: obj1,
        objectNotFound: true,
      });

      expect(auditHelperSpy).not.toHaveBeenCalled();
      expect(addAuditEventSpy).not.toHaveBeenCalled();
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    test(`throws when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeGet({
          namespace,
          object: obj1,
        })
      ).rejects.toThrow(`Unable to get ${obj1.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds a single audit event when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeGet({
          namespace,
          object: obj1,
        })
      ).rejects.toThrow(`Unable to get ${obj1.type}`);

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: 'Unable to get a',
        },
        event: {
          action: AuditAction.GET,
          category: ['database'],
          outcome: 'failure',
          type: ['access'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          saved_object: { type: obj1.type, id: obj1.id },
        },
        message: `Failed attempt to access ${obj1.type} [id=${obj1.id}]`,
      });
    });

    test(`adds an audit event when unauthorized even if object is not found`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, actionString, false);

      await expect(
        securityExtension.authorizeGet({
          namespace,
          object: obj1,
          objectNotFound: true,
        })
      ).rejects.toThrow(`Unable to get ${obj1.type}`);

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: 'Unable to get a',
        },
        event: {
          action: AuditAction.GET,
          category: ['database'],
          outcome: 'failure',
          type: ['access'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          saved_object: { type: obj1.type, id: obj1.id },
        },
        message: `Failed attempt to access ${obj1.type} [id=${obj1.id}]`,
      });
    });
  });

  describe(`#authorizeBulkGet`, () => {
    const actionString = 'bulk_get';

    const objA = {
      ...obj1,
      objectNamespaces: ['y', namespace], // include multiple spaces
    };
    const objB = { ...obj2, objectNamespaces: ['z'], existingNamespaces: ['y'] }; // use a different namespace than the options namespace;

    const objects = [objA, objB];

    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_get', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/bulk_get', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/bulk_get', authorized: true },
          { resource: 'z', privilege: 'mock-saved_object:b/bulk_get', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    const expectedTypes = new Set(objects.map((obj) => obj.type));
    const expectedActions = new Set([SecurityAction.BULK_GET]);
    const expectedSpaces = new Set([namespace, ...objA.objectNamespaces, ...objB.objectNamespaces]);

    const expectedEnforceMap = new Map([
      [obj1.type, new Set([namespace, ...objA.objectNamespaces])],
      [obj2.type, new Set([namespace, ...objB.objectNamespaces])],
    ]);

    const expectedTypeMap = new Map()
      .set('a', {
        bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('b', {
        bulk_get: {
          authorizedSpaces: ['x', 'y', 'z'],
        },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      });

    test('throws an error when `objects` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      const emptyObjects: AuthorizeBulkGetObject[] = [];

      await expect(
        securityExtension.authorizeBulkGet({
          namespace,
          objects: emptyObjects,
        })
      ).rejects.toThrowError('No objects specified for bulk_get authorization');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when `namespace` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeBulkGet({
          namespace: '',
          objects,
        })
      ).rejects.toThrowError('namespace cannot be an empty string');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(securityExtension.authorizeBulkGet({ namespace, objects })).rejects.toThrowError(
        'Oh no!'
      );
    });

    test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      await securityExtension.authorizeBulkGet({
        namespace,
        objects,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        auditOptions: { bypassOnSuccess: true, objects, useSuccessOutcome: true },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });

      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [
          `mock-saved_object:${objA.type}/${actionString}`,
          `mock-saved_object:${objB.type}/${actionString}`,
          'login:',
        ],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
        action: SecurityAction.BULK_GET,
        typesAndSpaces: expectedEnforceMap,
        typeMap: expectedTypeMap,
        auditOptions: { bypassOnSuccess: true, objects, useSuccessOutcome: true },
      });
    });

    test(`returns result when fully authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      const result = await securityExtension.authorizeBulkGet({
        namespace,
        objects,
      });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: expectedTypeMap,
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`returns result when partially authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/bulk_get', authorized: true },
            { privilege: 'login:', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:b/bulk_get', authorized: true },
            { resource: 'y', privilege: 'mock-saved_object:b/bulk_get', authorized: false },
            { resource: 'z', privilege: 'mock-saved_object:b/bulk_get', authorized: true },
          ],
        },
      } as CheckPrivilegesResponse);

      const result = await securityExtension.authorizeBulkGet({
        namespace,
        objects,
      });
      expect(result).toEqual({
        status: 'partially_authorized',
        typeMap: new Map()
          .set(objA.type, {
            bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set(objB.type, {
            bulk_get: { authorizedSpaces: ['x', 'z'] },
            ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
          }),
      });
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds an audit event per object when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await securityExtension.authorizeBulkGet({
        namespace,
        objects,
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.GET,
            category: ['database'],
            outcome: 'success',
            type: ['access'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: { type: obj.type, id: obj.id },
          },
          message: `User has accessed ${obj.type} [id=${obj.id}]`,
        });
      }
    });

    test(`does not add an audit event for objects with an error when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await securityExtension.authorizeBulkGet({
        namespace,
        objects: [objA, { ...objB, error: true }],
      });

      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: undefined,
        event: {
          action: AuditAction.GET,
          category: ['database'],
          outcome: 'success',
          type: ['access'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          saved_object: { type: objA.type, id: objA.id },
        },
        message: `User has accessed ${objA.type} [id=${objA.id}]`,
      });
    });

    test(`throws when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/bulk_get', authorized: true },
            { privilege: 'login:', authorized: true },
            { resource: 'x', privilege: 'mock-saved_object:b/bulk_get', authorized: true },
            { resource: 'y', privilege: 'mock-saved_object:b/bulk_get', authorized: true },
            { resource: 'z', privilege: 'mock-saved_object:b/bulk_get', authorized: false },
          ],
        },
      } as CheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeBulkGet({
          namespace,
          objects,
        })
      ).rejects.toThrow(`Unable to bulk_get ${objB.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds an audit event per object when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'bulk_delete', false);

      await expect(
        securityExtension.authorizeBulkGet({
          namespace,
          objects: [objA, { ...objB, error: true }], // setting error here to test the case that even err'd objects get an audit on failure
        })
      ).rejects.toThrow(`Unable to bulk_get ${obj1.type},${obj2.type}`);
      expect(auditHelperSpy).toHaveBeenCalledTimes(1);
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: {
            code: 'Error',
            message: `Unable to bulk_get ${objA.type},${objB.type}`,
          },
          event: {
            action: AuditAction.GET,
            category: ['database'],
            outcome: 'failure',
            type: ['access'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: { type: obj.type, id: obj.id },
          },
          message: `Failed attempt to access ${obj.type} [id=${obj.id}]`,
        });
      }
    });
  });
});

describe(`#authorizeCheckConflicts`, () => {
  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  const namespace = 'x';
  const actionString = 'bulk_create';
  const objects = [obj1, obj2, obj3, obj4];
  const fullyAuthorizedCheckPrivilegesResponse = {
    hasAllRequested: true,
    privileges: {
      kibana: [
        { privilege: 'mock-saved_object:a/bulk_create', authorized: true },
        { privilege: 'login:', authorized: true },
        { resource: 'x', privilege: 'mock-saved_object:b/bulk_create', authorized: true },
        { resource: 'x', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
        { resource: 'x', privilege: 'mock-saved_object:d/bulk_create', authorized: true },
        { resource: 'bar', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
        { resource: 'z', privilege: 'mock-saved_object:d/bulk_create', authorized: true },
      ],
    },
  } as CheckPrivilegesResponse;

  const expectedTypes = new Set(objects.map((obj) => obj.type));

  const expectedActions = new Set([SecurityAction.CHECK_CONFLICTS]);
  const expectedSpaces = new Set([namespace]);

  const expectedEnforceMap = new Map([
    [obj1.type, new Set([namespace])],
    [obj2.type, new Set([namespace])],
    [obj3.type, new Set([namespace])],
    [obj4.type, new Set([namespace])],
  ]);

  const expectedTypeMap = new Map()
    .set('a', {
      bulk_create: { isGloballyAuthorized: true, authorizedSpaces: [] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    })
    .set('b', {
      bulk_create: { authorizedSpaces: ['x'] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    })
    .set('c', {
      bulk_create: { authorizedSpaces: ['x', 'bar'] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    })
    .set('d', {
      bulk_create: { authorizedSpaces: ['x', 'z'] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    });

  test('throws an error when `objects` is empty', async () => {
    const { securityExtension, checkPrivileges } = setup();
    const emptyObjects: AuthorizeObjectWithExistingSpaces[] = [];

    await expect(
      securityExtension.authorizeCheckConflicts({
        namespace,
        objects: emptyObjects,
      })
    ).rejects.toThrowError('No objects specified for bulk_create authorization');
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('throws an error when `namespace` is empty', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeCheckConflicts({
        namespace: '',
        objects,
      })
    ).rejects.toThrowError('namespace cannot be an empty string');
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('throws an error when checkAuthorization fails', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockRejectedValue(new Error('Oh no!'));

    await expect(
      securityExtension.authorizeCheckConflicts({ namespace, objects })
    ).rejects.toThrowError('Oh no!');
  });

  test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

    await securityExtension.authorizeCheckConflicts({
      namespace,
      objects,
    });

    expect(authorizeSpy).toHaveBeenCalledTimes(1);
    expect(authorizeSpy).toHaveBeenCalledWith({
      actions: expectedActions,
      types: expectedTypes,
      spaces: expectedSpaces,
      enforceMap: expectedEnforceMap,
      auditOptions: {
        bypassOnFailure: true,
        bypassOnSuccess: true,
      },
    });

    expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(checkAuthorizationSpy).toHaveBeenCalledWith({
      actions: new Set([actionString]),
      spaces: expectedSpaces,
      types: expectedTypes,
      options: { allowGlobalResource: false },
    });

    expect(checkPrivileges).toHaveBeenCalledTimes(1);
    expect(checkPrivileges).toHaveBeenCalledWith(
      [
        `mock-saved_object:${obj1.type}/${actionString}`,
        `mock-saved_object:${obj2.type}/${actionString}`,
        `mock-saved_object:${obj3.type}/${actionString}`,
        `mock-saved_object:${obj4.type}/${actionString}`,
        'login:',
      ],
      [...expectedSpaces]
    );

    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
      action: SecurityAction.CHECK_CONFLICTS,
      typesAndSpaces: expectedEnforceMap,
      typeMap: expectedTypeMap,
      auditOptions: { bypassOnFailure: true, bypassOnSuccess: true },
    });
  });

  test(`returns result when fully authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    const result = await securityExtension.authorizeCheckConflicts({
      namespace,
      objects,
    });
    expect(result).toEqual({
      status: 'fully_authorized',
      typeMap: expectedTypeMap,
    });
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`returns result when partially authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_create', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/bulk_create', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:c/bulk_create', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:d/bulk_create', authorized: true },
          { resource: 'bar', privilege: 'mock-saved_object:c/bulk_create', authorized: false },
          { resource: 'z', privilege: 'mock-saved_object:d/bulk_create', authorized: false },
        ],
      },
    } as CheckPrivilegesResponse);

    const result = await securityExtension.authorizeCheckConflicts({
      namespace,
      objects,
    });
    expect(result).toEqual({
      status: 'partially_authorized',
      typeMap: new Map()
        .set(obj1.type, {
          bulk_create: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set(obj2.type, {
          bulk_create: { authorizedSpaces: ['x'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set(obj3.type, {
          bulk_create: { authorizedSpaces: ['x'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set(obj4.type, {
          bulk_create: { authorizedSpaces: ['x'] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
    });
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`does not add any audit events when successful`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await securityExtension.authorizeCheckConflicts({
      namespace,
      objects,
    });

    expect(auditHelperSpy).not.toHaveBeenCalled();
    expect(addAuditEventSpy).not.toHaveBeenCalled();
    expect(auditLogger.log).not.toHaveBeenCalled();
  });

  test(`throws when unauthorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_create', authorized: true },
          { privilege: 'login:', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeCheckConflicts({
        namespace,
        objects,
      })
    ).rejects.toThrow(`Unable to bulk_create ${obj2.type},${obj3.type},${obj4.type}`);
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`does not add any audit events when unauthorized`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'bulk_create', false);

    await expect(
      securityExtension.authorizeCheckConflicts({
        namespace,
        objects,
      })
    ).rejects.toThrow(`Unable to bulk_create ${obj1.type},${obj2.type},${obj3.type},${obj4.type}`);
    expect(auditHelperSpy).not.toHaveBeenCalled();
    expect(addAuditEventSpy).not.toHaveBeenCalled();
    expect(auditLogger.log).not.toHaveBeenCalled();
  });
});

describe(`#authorizeRemoveReferences`, () => {
  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  const namespace = 'x';
  const actionString = 'delete';
  const fullyAuthorizedCheckPrivilegesResponse = {
    hasAllRequested: true,
    privileges: {
      kibana: [
        { privilege: 'mock-saved_object:a/delete', authorized: true },
        { privilege: 'login:', authorized: true },
      ],
    },
  } as CheckPrivilegesResponse;

  const expectedTypes = new Set([obj1.type]);
  const expectedSpaces = new Set([namespace]);
  const expectedEnforceMap = new Map([[obj1.type, new Set([namespace])]]);

  const expectedTypeMap = new Map().set('a', {
    delete: { isGloballyAuthorized: true, authorizedSpaces: [] },
    ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
  });

  test('throws an error when `namespace` is empty', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeRemoveReferences({
        namespace: '',
        object: obj1,
      })
    ).rejects.toThrowError('namespace cannot be an empty string');
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('throws an error when checkAuthorization fails', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockRejectedValue(new Error('Oh no!'));

    await expect(
      securityExtension.authorizeRemoveReferences({ namespace, object: obj1 })
    ).rejects.toThrowError('Oh no!');
  });

  test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

    await securityExtension.authorizeRemoveReferences({
      namespace,
      object: obj1,
    });

    expect(authorizeSpy).toHaveBeenCalledTimes(1);
    expect(authorizeSpy).toHaveBeenCalledWith({
      actions: new Set([SecurityAction.REMOVE_REFERENCES]),
      types: expectedTypes,
      spaces: expectedSpaces,
      enforceMap: expectedEnforceMap,
      auditOptions: {
        objects: [obj1],
      },
    });

    expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(checkAuthorizationSpy).toHaveBeenCalledWith({
      actions: new Set([actionString]),
      spaces: expectedSpaces,
      types: expectedTypes,
      options: { allowGlobalResource: false },
    });

    expect(checkPrivileges).toHaveBeenCalledTimes(1);
    expect(checkPrivileges).toHaveBeenCalledWith(
      [`mock-saved_object:${obj1.type}/${actionString}`, 'login:'],
      [...expectedSpaces]
    );

    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
      action: SecurityAction.REMOVE_REFERENCES,
      typesAndSpaces: expectedEnforceMap,
      typeMap: expectedTypeMap,
      auditOptions: { objects: [obj1] },
    });
  });

  test(`returns result when fully authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    const result = await securityExtension.authorizeRemoveReferences({
      namespace,
      object: obj1,
    });
    expect(result).toEqual({
      status: 'fully_authorized',
      typeMap: expectedTypeMap,
    });
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`returns result when partially authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/delete', authorized: true },
          { privilege: 'login:', authorized: false },
        ],
      },
    } as CheckPrivilegesResponse);

    const result = await securityExtension.authorizeRemoveReferences({
      namespace,
      object: obj1,
    });
    expect(result).toEqual({
      status: 'partially_authorized',
      typeMap: new Map().set(obj1.type, {
        delete: { isGloballyAuthorized: true, authorizedSpaces: [] },
      }),
    });
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`adds audit event when successful`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await securityExtension.authorizeRemoveReferences({
      namespace,
      object: obj1,
    });

    expect(auditHelperSpy).toHaveBeenCalledTimes(1);
    expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: undefined,
      event: {
        action: AuditAction.REMOVE_REFERENCES,
        category: ['database'],
        outcome: 'unknown',
        type: ['change'],
      },
      kibana: {
        add_to_spaces: undefined,
        delete_from_spaces: undefined,
        saved_object: { type: obj1.type, id: obj1.id },
      },
      message: `User is removing references to ${obj1.type} [id=${obj1.id}]`,
    });
  });

  test(`throws when unauthorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'delete', false);

    await expect(
      securityExtension.authorizeRemoveReferences({
        namespace,
        object: obj1,
      })
    ).rejects.toThrow(`Unable to delete ${obj1.type}`);
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`adds audit event when unauthorized`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'delete', false);

    await expect(
      securityExtension.authorizeRemoveReferences({
        namespace,
        object: obj1,
      })
    ).rejects.toThrow(`Unable to delete ${obj1.type}`);
    expect(auditHelperSpy).toHaveBeenCalledTimes(1);
    expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: { code: 'Error', message: `Unable to delete ${obj1.type}` },
      event: {
        action: AuditAction.REMOVE_REFERENCES,
        category: ['database'],
        outcome: 'failure',
        type: ['change'],
      },
      kibana: {
        add_to_spaces: undefined,
        delete_from_spaces: undefined,
        saved_object: { type: obj1.type, id: obj1.id },
      },
      message: `Failed attempt to remove references to ${obj1.type} [id=${obj1.id}]`,
    });
  });
});

describe(`#authorizeOpenPointInTime`, () => {
  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  const namespace = 'x';
  const actionString = 'open_point_in_time';
  const fullyAuthorizedCheckPrivilegesResponse = {
    hasAllRequested: true,
    privileges: {
      kibana: [
        { privilege: 'mock-saved_object:a/open_point_in_time', authorized: true },
        { privilege: 'login:', authorized: true },
      ],
    },
  } as CheckPrivilegesResponse;

  const expectedTypes = new Set([obj1.type]);
  const expectedSpaces = new Set([namespace]);
  const expectedTypeMap = new Map().set('a', {
    open_point_in_time: { isGloballyAuthorized: true, authorizedSpaces: [] },
    ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
  });

  test('throws an error when `namespaces` is empty', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeOpenPointInTime({
        namespaces: new Set(),
        types: expectedTypes,
      })
    ).rejects.toThrowError('No spaces specified for authorization');
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('throws an error when `types` is empty', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeOpenPointInTime({
        namespaces: expectedSpaces,
        types: new Set(),
      })
    ).rejects.toThrowError('No types specified for authorization');
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('throws an error when checkAuthorization fails', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockRejectedValue(new Error('Oh no!'));

    await expect(
      securityExtension.authorizeOpenPointInTime({
        namespaces: expectedSpaces,
        types: expectedTypes,
      })
    ).rejects.toThrowError('Oh no!');
  });

  test(`calls authorize methods with expected actions, types, spaces, and no enforce map`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

    await securityExtension.authorizeOpenPointInTime({
      namespaces: expectedSpaces,
      types: expectedTypes,
    });

    expect(authorizeSpy).toHaveBeenCalledTimes(1);
    expect(authorizeSpy).toHaveBeenCalledWith({
      actions: new Set([SecurityAction.OPEN_POINT_IN_TIME]),
      types: expectedTypes,
      spaces: expectedSpaces,
    });

    expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(checkAuthorizationSpy).toHaveBeenCalledWith({
      actions: new Set([actionString]),
      spaces: expectedSpaces,
      types: expectedTypes,
      options: { allowGlobalResource: false },
    });

    expect(checkPrivileges).toHaveBeenCalledTimes(1);
    expect(checkPrivileges).toHaveBeenCalledWith(
      [`mock-saved_object:${obj1.type}/${actionString}`, 'login:'],
      [...expectedSpaces]
    );

    expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
  });

  test(`returns result when fully authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    const result = await securityExtension.authorizeOpenPointInTime({
      namespaces: expectedSpaces,
      types: expectedTypes,
    });
    expect(result).toEqual({
      status: 'fully_authorized',
      typeMap: expectedTypeMap,
    });
    expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
  });

  test(`returns result when partially authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/open_point_in_time', authorized: true },
          { privilege: 'login:', authorized: false },
        ],
      },
    } as CheckPrivilegesResponse);

    const result = await securityExtension.authorizeOpenPointInTime({
      namespaces: expectedSpaces,
      types: expectedTypes,
    });
    expect(result).toEqual({
      status: 'partially_authorized',
      typeMap: new Map().set(obj1.type, {
        open_point_in_time: { isGloballyAuthorized: true, authorizedSpaces: [] },
      }),
    });
    expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
  });

  test(`adds audit event when successful`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await securityExtension.authorizeOpenPointInTime({
      namespaces: expectedSpaces,
      types: expectedTypes,
    });

    expect(auditHelperSpy).not.toHaveBeenCalled(); // The helper is not called, as open PIT calls the addAudit method directly
    expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: undefined,
      event: {
        action: AuditAction.OPEN_POINT_IN_TIME,
        category: ['database'],
        outcome: 'unknown',
        type: ['creation'],
      },
      kibana: {
        add_to_spaces: undefined,
        delete_from_spaces: undefined,
        saved_object: undefined,
      },
      message: `User is opening point-in-time saved objects`,
    });
  });

  test(`throws when unauthorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'delete', false);

    await expect(
      securityExtension.authorizeOpenPointInTime({
        namespaces: expectedSpaces,
        types: expectedTypes,
      })
    ).rejects.toThrow(`User is unauthorized for any requested types/spaces.`);
  });

  test(`adds audit event when unauthorized`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'open_point_in_time', false);

    await expect(
      securityExtension.authorizeOpenPointInTime({
        namespaces: expectedSpaces,
        types: expectedTypes,
      })
    ).rejects.toThrow(`User is unauthorized for any requested types/spaces.`);
    expect(auditHelperSpy).not.toHaveBeenCalled();
    expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: { code: 'Error', message: `User is unauthorized for any requested types/spaces.` },
      event: {
        action: AuditAction.OPEN_POINT_IN_TIME,
        category: ['database'],
        outcome: 'failure',
        type: ['creation'],
      },
      kibana: {
        add_to_spaces: undefined,
        delete_from_spaces: undefined,
        saved_object: undefined,
      },
      message: `Failed attempt to open point-in-time saved objects`,
    });
  });
});

describe(`#auditClosePointInTime`, () => {
  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  test(`adds audit event`, async () => {
    const { securityExtension, auditLogger } = setup();
    securityExtension.auditClosePointInTime();

    expect(auditHelperSpy).not.toHaveBeenCalled(); // The helper is not called, as close PIT calls the addAudit method directly
    expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: undefined,
      event: {
        action: AuditAction.CLOSE_POINT_IN_TIME,
        category: ['database'],
        outcome: 'unknown',
        type: ['deletion'],
      },
      kibana: {
        add_to_spaces: undefined,
        delete_from_spaces: undefined,
        saved_object: undefined,
      },
      message: `User is closing point-in-time saved objects`,
    });
  });
});

describe('#authorizeAndRedactMultiNamespaceReferences', () => {
  const namespace = 'x';

  const refObj1 = {
    id: 'id-1',
    inboundReferences: [],
    originId: undefined,
    spaces: ['default', 'space-1'],
    spacesWithMatchingAliases: ['space-2', 'space-3', 'space-4'],
    spacesWithMatchingOrigins: undefined,
    type: 'a',
  };
  const refObj2 = {
    id: 'id-2',
    inboundReferences: [],
    originId: undefined,
    spaces: ['default', 'space-2'],
    spacesWithMatchingAliases: undefined,
    spacesWithMatchingOrigins: ['space-1', 'space-3'],
    type: 'b',
  };
  const refObj3 = {
    id: 'id-3',
    inboundReferences: [{ id: 'id-1', name: 'ref-name', type: 'a' }],
    originId: undefined,
    spaces: ['default', 'space-1', 'space-4'],
    spacesWithMatchingAliases: undefined,
    spacesWithMatchingOrigins: undefined,
    type: 'c',
  };
  const objects = [refObj1, refObj2, refObj3];

  const expectedTypes = new Set(objects.map((obj) => obj.type));
  const expectedSpaces = new Set([
    namespace,
    ...refObj1.spaces,
    ...refObj1.spacesWithMatchingAliases,
    ...refObj2.spaces,
    ...refObj2.spacesWithMatchingOrigins,
    ...refObj3.spaces,
  ]);

  const expectedEnforceMap = new Map([
    [refObj1.type, new Set([namespace])],
    [refObj2.type, new Set([namespace])],
    [refObj3.type, new Set([namespace])],
  ]);

  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  // NOTE: This comment should inform our test cases...
  // Now, filter/redact the results. Most SOR functions just redact the `namespaces` field from each returned object. However, this function
  // will actually filter the returned object graph itself.
  // This is done in two steps: (1) objects which the user can't access *in this space* are filtered from the graph, and the
  // graph is rearranged to avoid leaking information. (2) any spaces that the user can't access are redacted from each individual object.
  // After we finish filtering, we can write audit events for each object that is going to be returned to the user.

  describe('purpose `collectMultiNamespaceReferences`', () => {
    const actionString = 'bulk_get';

    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_get', authorized: true },
          { privilege: 'login:', authorized: true },
          {
            resource: 'x',
            privilege: 'mock-saved_object:b/bulk_get',
            authorized: true,
          },
          {
            resource: 'space-1',
            privilege: 'mock-saved_object:b/bulk_get',
            authorized: true,
          },
          {
            resource: 'space-2',
            privilege: 'mock-saved_object:b/bulk_get',
            authorized: true,
          },
          {
            resource: 'space-3',
            privilege: 'mock-saved_object:b/bulk_get',
            authorized: true,
          },
          {
            resource: 'x',
            privilege: 'mock-saved_object:c/bulk_get',
            authorized: true,
          },
          {
            resource: 'space-1',
            privilege: 'mock-saved_object:c/bulk_get',
            authorized: true,
          },
          {
            resource: 'space-4',
            privilege: 'mock-saved_object:c/bulk_get',
            authorized: true,
          },
        ],
      },
    } as CheckPrivilegesResponse;

    const partiallyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_get', authorized: true },
          // { privilege: 'login:', authorized: true },
          {
            resource: 'x',
            privilege: 'login:',
            authorized: true,
          },
          {
            resource: 'space-1',
            privilege: 'login:',
            authorized: true,
          },
          {
            resource: 'space-2',
            privilege: 'login:',
            authorized: true,
          },
          {
            resource: 'x',
            privilege: 'mock-saved_object:b/bulk_get',
            authorized: true,
          },
          {
            resource: 'space-1',
            privilege: 'mock-saved_object:b/bulk_get',
            authorized: true,
          },
          {
            resource: 'space-2',
            privilege: 'mock-saved_object:b/bulk_get',
            authorized: true,
          },
          {
            resource: 'x',
            privilege: 'mock-saved_object:c/bulk_get',
            authorized: true,
          },
          {
            resource: 'space-1',
            privilege: 'mock-saved_object:c/bulk_get',
            authorized: true,
          },
        ],
      },
    } as CheckPrivilegesResponse;

    const redactedObjects = [
      {
        ...refObj1,
        spaces: ['space-1', '?'],
        spacesWithMatchingAliases: ['space-2', '?', '?'],
      },
      { ...refObj2, spaces: ['space-2', '?'], spacesWithMatchingOrigins: ['space-1', '?'] },
      { ...refObj3, spaces: ['space-1', '?', '?'] },
    ];
    const expectedActions = new Set([SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES]);

    const fullyAuthorizedTypeMap = new Map()
      .set('a', {
        bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('b', {
        bulk_get: { authorizedSpaces: ['x', 'space-1', 'space-2', 'space-3'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('c', {
        bulk_get: { authorizedSpaces: ['x', 'space-1', 'space-4'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      });

    const partiallyAuthorizedTypeMap = new Map()
      .set('a', {
        bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
        ['login:']: { authorizedSpaces: ['x', 'space-1', 'space-2'] },
      })
      .set('b', {
        bulk_get: { authorizedSpaces: ['x', 'space-1', 'space-2'] },
        ['login:']: { authorizedSpaces: ['x', 'space-1', 'space-2'] },
      })
      .set('c', {
        bulk_get: { authorizedSpaces: ['x', 'space-1'] },
        ['login:']: { authorizedSpaces: ['x', 'space-1', 'space-2'] },
      });

    test('returns empty array when no objects are provided`', async () => {
      const { securityExtension } = setup();
      const emptyObjects: SavedObjectReferenceWithContext[] = [];

      const result = await securityExtension.authorizeAndRedactMultiNamespaceReferences({
        namespace,
        objects: emptyObjects,
      });
      expect(result).toEqual(emptyObjects);
    });

    test('throws an error when `namespace` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      await expect(
        securityExtension.authorizeAndRedactMultiNamespaceReferences({
          namespace: '',
          objects: [refObj1, refObj2],
        })
      ).rejects.toThrowError('namespace cannot be an empty string');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.authorizeAndRedactMultiNamespaceReferences({
          namespace,
          objects,
        })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      await securityExtension.authorizeAndRedactMultiNamespaceReferences({
        namespace,
        objects,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        auditOptions: {
          bypassOnSuccess: true,
        },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });

      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [
          `mock-saved_object:${refObj1.type}/${actionString}`,
          `mock-saved_object:${refObj2.type}/${actionString}`,
          `mock-saved_object:${refObj3.type}/${actionString}`,
          'login:',
        ],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(4);
      // Called once with complete enforce map (bypasses audit on success)
      expect(enforceAuthorizationSpy).toHaveBeenNthCalledWith(1, {
        action: SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES,
        typesAndSpaces: expectedEnforceMap,
        typeMap: partiallyAuthorizedTypeMap,
        auditOptions: { bypassOnSuccess: true },
      });
      // Called once per object afterward
      let i = 2;
      for (const obj of objects) {
        expect(enforceAuthorizationSpy).toHaveBeenNthCalledWith(i++, {
          action: SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES,
          typesAndSpaces: new Map([[obj.type, new Set([namespace])]]),
          typeMap: partiallyAuthorizedTypeMap,
          auditOptions: { bypassOnSuccess: true, bypassOnFailure: true },
        });
      }
    });

    test(`returns unredacted result when fully authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      const result = await securityExtension.authorizeAndRedactMultiNamespaceReferences({
        namespace,
        objects,
      });

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(4);
      expect(enforceAuthorizationSpy).toHaveBeenNthCalledWith(1, {
        action: SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES,
        typesAndSpaces: expectedEnforceMap,
        typeMap: fullyAuthorizedTypeMap,
        auditOptions: { bypassOnSuccess: true },
      });
      let i = 2;
      for (const obj of objects) {
        expect(enforceAuthorizationSpy).toHaveBeenNthCalledWith(i++, {
          action: SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES,
          typesAndSpaces: new Map([[obj.type, new Set([namespace])]]),
          typeMap: fullyAuthorizedTypeMap,
          auditOptions: { bypassOnSuccess: true, bypassOnFailure: true },
        });
      }
      expect(result).toEqual(objects);
    });

    test(`returns redacted result when partially authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      const result = await securityExtension.authorizeAndRedactMultiNamespaceReferences({
        namespace,
        objects,
      });
      expect(redactNamespacesSpy).toHaveBeenCalledTimes(5); // spaces x3, spaces of aliases x1, spaces of origins x1
      expect(result).toEqual(redactedObjects);
    });

    test(`adds an audit event per object when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      await securityExtension.authorizeAndRedactMultiNamespaceReferences({
        namespace,
        objects,
      });

      // the audit helper is not called during this action
      // the addAuditEvent method is called directly
      expect(auditHelperSpy).not.toHaveBeenCalled();
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      let i = 1;
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenNthCalledWith(i++, {
          error: undefined,
          event: {
            action: AuditAction.COLLECT_MULTINAMESPACE_REFERENCES,
            category: ['database'],
            outcome: 'success',
            type: ['access'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: { type: obj.type, id: obj.id },
          },
          message: `User has collected references and spaces of ${obj.type} [id=${obj.id}]`,
        });
      }
    });

    test(`throws when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/bulk_get', authorized: true },
            { privilege: 'login:', authorized: true },
          ],
        },
      } as CheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeAndRedactMultiNamespaceReferences({
          namespace,
          objects,
        })
      ).rejects.toThrow(`Unable to bulk_get ${refObj2.type},${refObj3.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    });

    test(`adds a single audit event when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [{ privilege: 'login:', authorized: true }],
        },
      } as CheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeAndRedactMultiNamespaceReferences({
          namespace,
          objects,
        })
      ).rejects.toThrow(`Unable to bulk_get ${refObj1.type},${refObj2.type},${refObj3.type}`);
      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);

      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: {
          code: 'Error',
          message: `Unable to bulk_get ${refObj1.type},${refObj2.type},${refObj3.type}`,
        },
        event: {
          action: AuditAction.COLLECT_MULTINAMESPACE_REFERENCES,
          category: ['database'],
          outcome: 'failure',
          type: ['access'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          saved_object: undefined,
        },
        message: `Failed attempt to collect references and spaces of saved objects`,
      });
    });
  });

  describe('purpose `updateObjectsSpaces`', () => {
    const actionString = 'share_to_space';
    const purpose = 'updateObjectsSpaces';

    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/share_to_space', authorized: true },
          { privilege: 'login:', authorized: true },
          {
            resource: 'x',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: true,
          },
          {
            resource: 'space-1',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: true,
          },
          {
            resource: 'space-2',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: true,
          },
          {
            resource: 'space-3',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: true,
          },
          {
            resource: 'x',
            privilege: 'mock-saved_object:c/share_to_space',
            authorized: true,
          },
          {
            resource: 'space-1',
            privilege: 'mock-saved_object:c/share_to_space',
            authorized: true,
          },
          {
            resource: 'space-4',
            privilege: 'mock-saved_object:c/share_to_space',
            authorized: true,
          },
        ],
      },
    } as CheckPrivilegesResponse;

    const expectedActions = new Set([
      SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES_UPDATE_SPACES,
    ]);

    const fullyAuthorizedTypeMap = new Map()
      .set('a', {
        share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('b', {
        share_to_space: { authorizedSpaces: ['x', 'space-1', 'space-2', 'space-3'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      })
      .set('c', {
        share_to_space: { authorizedSpaces: ['x', 'space-1', 'space-4'] },
        ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
      });

    test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await securityExtension.authorizeAndRedactMultiNamespaceReferences({
        namespace,
        objects,
        options: { purpose },
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        auditOptions: {
          bypassOnSuccess: true,
        },
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });

      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [
          `mock-saved_object:${refObj1.type}/${actionString}`,
          `mock-saved_object:${refObj2.type}/${actionString}`,
          `mock-saved_object:${refObj3.type}/${actionString}`,
          'login:',
        ],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(4);
      // Called once with complete enforce map (bypasses audit on success)
      expect(enforceAuthorizationSpy).toHaveBeenNthCalledWith(1, {
        action: SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES_UPDATE_SPACES,
        typesAndSpaces: expectedEnforceMap,
        typeMap: fullyAuthorizedTypeMap,
        auditOptions: { bypassOnSuccess: true },
      });
      // Called once per object afterward
      let i = 2;
      for (const obj of objects) {
        expect(enforceAuthorizationSpy).toHaveBeenNthCalledWith(i++, {
          action: SecurityAction.COLLECT_MULTINAMESPACE_REFERENCES_UPDATE_SPACES,
          typesAndSpaces: new Map([[obj.type, new Set([namespace])]]),
          typeMap: fullyAuthorizedTypeMap,
          auditOptions: { bypassOnSuccess: true, bypassOnFailure: true },
        });
      }
    });
  });
});

describe('#authorizeAndRedactInternalBulkResolve', () => {
  const namespace = 'x';

  const resolveObj1: SavedObjectsResolveResponse<unknown> = {
    outcome: 'exactMatch',
    saved_object: {
      attributes: {},
      id: '13',
      namespaces: ['foo'],
      references: [],
      type: 'a',
    },
  };
  const resolveObj2: SavedObjectsResolveResponse<unknown> = {
    outcome: 'exactMatch',
    saved_object: {
      attributes: {},
      id: '14',
      namespaces: ['bar'],
      references: [],
      type: 'b',
    },
  };

  const objects = [resolveObj1, resolveObj2];

  const expectedTypes = new Set(objects.map((obj) => obj.saved_object.type));
  const expectedSpaces = new Set(['foo', 'bar', namespace]);

  const expectedEnforceMap = new Map([
    [resolveObj1.saved_object.type, new Set([namespace])],
    [resolveObj2.saved_object.type, new Set([namespace])],
  ]);

  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  const actionString = 'bulk_get';

  const fullyAuthorizedCheckPrivilegesResponse = {
    hasAllRequested: true,
    privileges: {
      kibana: [
        { privilege: 'mock-saved_object:a/bulk_get', authorized: true },
        { privilege: 'login:', authorized: true },
        {
          resource: 'x',
          privilege: 'mock-saved_object:b/bulk_get',
          authorized: true,
        },
        {
          resource: 'bar',
          privilege: 'mock-saved_object:b/bulk_get',
          authorized: true,
        },
      ],
    },
  } as CheckPrivilegesResponse;

  const partiallyAuthorizedCheckPrivilegesResponse = {
    hasAllRequested: false,
    privileges: {
      kibana: [
        { privilege: 'mock-saved_object:a/bulk_get', authorized: true },
        {
          resource: 'x',
          privilege: 'login:',
          authorized: true,
        },
        {
          resource: 'foo',
          privilege: 'login:',
          authorized: true,
        },
        {
          resource: 'x',
          privilege: 'mock-saved_object:b/bulk_get',
          authorized: true,
        },
        {
          resource: 'bar',
          privilege: 'mock-saved_object:b/bulk_get',
          authorized: true,
        },
      ],
    },
  } as CheckPrivilegesResponse;

  const redactedObjects = [
    resolveObj1,
    { ...resolveObj2, saved_object: { ...resolveObj2.saved_object, namespaces: ['?'] } },
  ];
  const expectedActions = new Set([SecurityAction.INTERNAL_BULK_RESOLVE]);

  const fullyAuthorizedTypeMap = new Map()
    .set('a', {
      bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    })
    .set('b', {
      bulk_get: { authorizedSpaces: ['x', 'bar'] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    });

  const partiallyAuthorizedTypeMap = new Map()
    .set('a', {
      bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
      ['login:']: { authorizedSpaces: ['x', 'foo'] },
    })
    .set('b', {
      bulk_get: { authorizedSpaces: ['x', 'bar'] },
      ['login:']: { authorizedSpaces: ['x', 'foo'] },
    });

  test('returns empty array when no objects are provided`', async () => {
    const { securityExtension } = setup();
    const emptyObjects: Array<SavedObjectsResolveResponse<unknown> | BulkResolveError> = [];

    const result = await securityExtension.authorizeAndRedactInternalBulkResolve({
      namespace,
      objects: emptyObjects,
    });
    expect(result).toEqual(emptyObjects);
  });

  test('throws an error when checkAuthorization fails', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockRejectedValue(new Error('Oh no!'));

    await expect(
      securityExtension.authorizeAndRedactInternalBulkResolve({
        namespace,
        objects,
      })
    ).rejects.toThrowError('Oh no!');
  });

  test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse);

    await securityExtension.authorizeAndRedactInternalBulkResolve({
      namespace,
      objects,
    });

    expect(authorizeSpy).toHaveBeenCalledTimes(1);
    expect(authorizeSpy).toHaveBeenCalledWith({
      actions: expectedActions,
      types: expectedTypes,
      spaces: expectedSpaces,
      enforceMap: expectedEnforceMap,
      auditOptions: {
        useSuccessOutcome: true,
      },
    });

    expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(checkAuthorizationSpy).toHaveBeenCalledWith({
      actions: new Set([actionString]),
      spaces: expectedSpaces,
      types: expectedTypes,
      options: { allowGlobalResource: false },
    });

    expect(checkPrivileges).toHaveBeenCalledTimes(1);
    expect(checkPrivileges).toHaveBeenCalledWith(
      [
        `mock-saved_object:${resolveObj1.saved_object.type}/${actionString}`,
        `mock-saved_object:${resolveObj2.saved_object.type}/${actionString}`,
        'login:',
      ],
      expect.arrayContaining([...expectedSpaces])
    );

    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
      action: SecurityAction.INTERNAL_BULK_RESOLVE,
      typesAndSpaces: expectedEnforceMap,
      typeMap: partiallyAuthorizedTypeMap,
      auditOptions: { useSuccessOutcome: true },
    });
  });

  test(`returns unredacted result when fully authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

    const result = await securityExtension.authorizeAndRedactInternalBulkResolve({
      namespace,
      objects,
    });

    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
      action: SecurityAction.INTERNAL_BULK_RESOLVE,
      typesAndSpaces: expectedEnforceMap,
      typeMap: fullyAuthorizedTypeMap,
      auditOptions: { useSuccessOutcome: true },
    });
    expect(result).toEqual(objects);
  });

  test(`returns redacted result when partially authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

    const result = await securityExtension.authorizeAndRedactInternalBulkResolve({
      namespace,
      objects,
    });
    expect(redactNamespacesSpy).toHaveBeenCalledTimes(2);
    expect(result).toEqual(redactedObjects);
  });

  test(`adds an audit event when successful`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await securityExtension.authorizeAndRedactInternalBulkResolve({
      namespace,
      objects,
    });

    expect(auditHelperSpy).toHaveBeenCalledTimes(1);
    expect(auditHelperSpy).toHaveBeenCalledWith({
      action: 'saved_object_resolve',
      objects: undefined,
      useSuccessOutcome: true,
    });
    expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
    expect(addAuditEventSpy).toHaveBeenCalledWith({
      action: 'saved_object_resolve',
      addToSpaces: undefined,
      deleteFromSpaces: undefined,
      error: undefined,
      outcome: 'success',
    });
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: undefined,
      event: {
        action: AuditAction.RESOLVE,
        category: ['database'],
        outcome: 'success',
        type: ['access'],
      },
      kibana: {
        add_to_spaces: undefined,
        delete_from_spaces: undefined,
        saved_object: undefined,
      },
      message: `User has resolved saved objects`,
    });
  });

  test(`throws when unauthorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/bulk_get', authorized: true },
          { privilege: 'login:', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeAndRedactInternalBulkResolve({
        namespace,
        objects,
      })
    ).rejects.toThrow(`Unable to bulk_get ${resolveObj2.saved_object.type}`);
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`adds an audit event when unauthorized`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [{ privilege: 'login:', authorized: true }],
      },
    } as CheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeAndRedactInternalBulkResolve({
        namespace,
        objects,
      })
    ).rejects.toThrow(
      `Unable to bulk_get ${resolveObj1.saved_object.type},${resolveObj2.saved_object.type}`
    );
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);

    expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledTimes(1);
    expect(auditLogger.log).toHaveBeenCalledWith({
      error: {
        code: 'Error',
        message: `Unable to bulk_get ${resolveObj1.saved_object.type},${resolveObj2.saved_object.type}`,
      },
      event: {
        action: AuditAction.RESOLVE,
        category: ['database'],
        outcome: 'failure',
        type: ['access'],
      },
      kibana: {
        add_to_spaces: undefined,
        delete_from_spaces: undefined,
        saved_object: undefined,
      },
      message: `Failed attempt to resolve saved objects`,
    });
  });
});

describe('#authorizeUpdateSpaces', () => {
  const namespace = 'x';

  const multiSpaceObj1 = {
    type: 'a',
    id: '1',
    existingNamespaces: ['add_space_1', 'add_space_2'],
  };
  const multiSpaceObj2 = {
    type: 'b',
    id: '2',
    existingNamespaces: ['*'],
  };
  const multiSpaceObj3 = {
    type: 'a',
    id: '3',
    existingNamespaces: ['rem_space_2', 'add_space_2'],
  };
  const multiSpaceObj4 = {
    type: 'b',
    id: '4',
    existingNamespaces: ['foo', 'add_space_1'],
  };

  const objects = [multiSpaceObj1, multiSpaceObj2, multiSpaceObj3, multiSpaceObj4];

  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  const actionString = 'share_to_space';

  const spacesToAdd = ['add_space_1', 'add_space_2'];
  const spacesToRemove = ['rem_space_1', 'rem_space_2'];

  const fullyAuthorizedCheckPrivilegesResponse = {
    hasAllRequested: true,
    privileges: {
      kibana: [
        { privilege: 'mock-saved_object:a/share_to_space', authorized: true },
        { privilege: 'login:', authorized: true },
        {
          resource: 'x',
          privilege: 'mock-saved_object:b/share_to_space',
          authorized: true,
        },
        {
          resource: 'add_space_1',
          privilege: 'mock-saved_object:b/share_to_space',
          authorized: true,
        },
        {
          resource: 'add_space_2',
          privilege: 'mock-saved_object:b/share_to_space',
          authorized: true,
        },
        {
          resource: 'rem_space_1',
          privilege: 'mock-saved_object:b/share_to_space',
          authorized: true,
        },
        {
          resource: 'rem_space_2',
          privilege: 'mock-saved_object:b/share_to_space',
          authorized: true,
        },
      ],
    },
  } as CheckPrivilegesResponse;

  const expectedTypes = new Set(objects.map((obj) => obj.type));

  const expectedActions = new Set([SecurityAction.UPDATE_OBJECTS_SPACES]);
  const expectedSpaces = new Set([...spacesToAdd, ...spacesToRemove, namespace, 'foo']);

  const expectedEnforceMap = new Map([
    [multiSpaceObj1.type, new Set([...spacesToAdd, ...spacesToRemove, namespace])],
    [multiSpaceObj2.type, new Set([...spacesToAdd, ...spacesToRemove, namespace])],
  ]);

  const expectedTypeMap = new Map()
    .set('a', {
      share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    })
    .set('b', {
      share_to_space: { authorizedSpaces: ['x', ...spacesToAdd, ...spacesToRemove] },
      ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
    });

  test('throws an error when `objects` is empty', async () => {
    const { securityExtension, checkPrivileges } = setup();
    const emptyObjects: AuthorizeObjectWithExistingSpaces[] = [];

    await expect(
      securityExtension.authorizeUpdateSpaces({
        namespace,
        spacesToAdd,
        spacesToRemove,
        objects: emptyObjects,
      })
    ).rejects.toThrowError('No objects specified for share_to_space authorization');
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('throws an error when `namespace` is an empty string', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeUpdateSpaces({
        namespace: '',
        spacesToAdd,
        spacesToRemove,
        objects,
      })
    ).rejects.toThrowError('namespace cannot be an empty string');
    expect(checkPrivileges).not.toHaveBeenCalled();
  });

  test('throws an error when checkAuthorization fails', async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockRejectedValue(new Error('Oh no!'));

    await expect(
      securityExtension.authorizeUpdateSpaces({ namespace, spacesToAdd, spacesToRemove, objects })
    ).rejects.toThrowError('Oh no!');
  });

  test(`calls authorize methods with expected actions, types, spaces, and enforce map`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await securityExtension.authorizeUpdateSpaces({
      namespace,
      spacesToAdd,
      spacesToRemove,
      objects,
    });

    expect(authorizeSpy).toHaveBeenCalledTimes(1);
    expect(authorizeSpy).toHaveBeenCalledWith({
      actions: expectedActions,
      types: expectedTypes,
      spaces: expectedSpaces,
      enforceMap: expectedEnforceMap,
      options: { allowGlobalResource: true },
      auditOptions: {
        objects,
        addToSpaces: spacesToAdd,
        deleteFromSpaces: spacesToRemove,
      },
    });

    expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(checkAuthorizationSpy).toHaveBeenCalledWith({
      actions: new Set([actionString]),
      spaces: expectedSpaces,
      types: expectedTypes,
      options: { allowGlobalResource: true },
    });

    expect(checkPrivileges).toHaveBeenCalledTimes(1);
    expect(checkPrivileges).toHaveBeenCalledWith(
      [
        `mock-saved_object:${multiSpaceObj1.type}/${actionString}`,
        `mock-saved_object:${multiSpaceObj2.type}/${actionString}`,
        'login:',
      ],
      [...expectedSpaces]
    );

    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
      action: SecurityAction.UPDATE_OBJECTS_SPACES,
      typesAndSpaces: expectedEnforceMap,
      typeMap: expectedTypeMap,
      auditOptions: { objects, addToSpaces: spacesToAdd, deleteFromSpaces: spacesToRemove },
    });
  });

  test(`calls authorize methods with '*' when spacesToAdd includes '*'`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/share_to_space', authorized: true },
          { privilege: 'mock-saved_object:b/share_to_space', authorized: true },
          { privilege: 'login:', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse);

    await securityExtension.authorizeUpdateSpaces({
      namespace,
      spacesToAdd: ['*'],
      spacesToRemove,
      objects,
    });

    const spaces = new Set(['*', ...spacesToRemove, 'x', 'add_space_1', 'add_space_2', 'foo']);
    const enforceMap = new Map([
      [multiSpaceObj1.type, new Set(['*', ...spacesToRemove, namespace])],
      [multiSpaceObj2.type, new Set(['*', ...spacesToRemove, namespace])],
    ]);

    expect(authorizeSpy).toHaveBeenCalledTimes(1);
    expect(authorizeSpy).toHaveBeenCalledWith({
      actions: expectedActions,
      types: expectedTypes,
      spaces,
      enforceMap,
      options: { allowGlobalResource: true },
      auditOptions: {
        objects,
        addToSpaces: ['*'],
        deleteFromSpaces: spacesToRemove,
      },
    });

    expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(checkAuthorizationSpy).toHaveBeenCalledWith({
      actions: new Set([actionString]),
      spaces,
      types: expectedTypes,
      options: { allowGlobalResource: true },
    });

    expect(checkPrivileges).toHaveBeenCalledTimes(1);
    expect(checkPrivileges).toHaveBeenCalledWith(
      [
        `mock-saved_object:${multiSpaceObj1.type}/${actionString}`,
        `mock-saved_object:${multiSpaceObj2.type}/${actionString}`,
        'login:',
      ],
      [...spaces]
    );

    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
      action: SecurityAction.UPDATE_OBJECTS_SPACES,
      typesAndSpaces: enforceMap,
      typeMap: new Map()
        .set('a', {
          share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('b', {
          share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      auditOptions: { objects, addToSpaces: ['*'], deleteFromSpaces: spacesToRemove },
    });
  });

  test(`calls authorize methods with '*' when spacesToRemove includes '*'`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/share_to_space', authorized: true },
          { privilege: 'mock-saved_object:b/share_to_space', authorized: true },
          { privilege: 'login:', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse);

    await securityExtension.authorizeUpdateSpaces({
      namespace,
      spacesToAdd,
      spacesToRemove: ['*'],
      objects,
    });

    const spaces = new Set([...spacesToAdd, '*', 'x', 'rem_space_2', 'foo']);
    const enforceMap = new Map([
      [multiSpaceObj1.type, new Set([...spacesToAdd, '*', namespace])],
      [multiSpaceObj2.type, new Set([...spacesToAdd, '*', namespace])],
    ]);

    expect(authorizeSpy).toHaveBeenCalledTimes(1);
    expect(authorizeSpy).toHaveBeenCalledWith({
      actions: expectedActions,
      types: expectedTypes,
      spaces,
      enforceMap,
      options: { allowGlobalResource: true },
      auditOptions: {
        objects,
        addToSpaces: spacesToAdd,
        deleteFromSpaces: ['*'],
      },
    });

    expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(checkAuthorizationSpy).toHaveBeenCalledWith({
      actions: new Set([actionString]),
      spaces,
      types: expectedTypes,
      options: { allowGlobalResource: true },
    });

    expect(checkPrivileges).toHaveBeenCalledTimes(1);
    expect(checkPrivileges).toHaveBeenCalledWith(
      [
        `mock-saved_object:${multiSpaceObj1.type}/${actionString}`,
        `mock-saved_object:${multiSpaceObj2.type}/${actionString}`,
        'login:',
      ],
      [...spaces]
    );

    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
    expect(enforceAuthorizationSpy).toHaveBeenCalledWith({
      action: SecurityAction.UPDATE_OBJECTS_SPACES,
      typesAndSpaces: enforceMap,
      typeMap: new Map()
        .set('a', {
          share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('b', {
          share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      auditOptions: { objects, addToSpaces: spacesToAdd, deleteFromSpaces: ['*'] },
    });
  });

  test(`returns result when fully authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    const result = await securityExtension.authorizeUpdateSpaces({
      namespace,
      spacesToAdd,
      spacesToRemove,
      objects,
    });
    expect(result).toEqual({
      status: 'fully_authorized',
      typeMap: expectedTypeMap,
    });
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`returns result when partially authorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/share_to_space', authorized: true },
          { privilege: 'login:', authorized: true },
          {
            resource: 'x',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: true,
          },
          {
            resource: 'foo',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: false,
          },
          {
            resource: 'add_space_1',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: true,
          },
          {
            resource: 'add_space_2',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: true,
          },
          {
            resource: 'rem_space_1',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: true,
          },
          {
            resource: 'rem_space_2',
            privilege: 'mock-saved_object:b/share_to_space',
            authorized: true,
          },
        ],
      },
    } as CheckPrivilegesResponse);

    const result = await securityExtension.authorizeUpdateSpaces({
      namespace,
      spacesToAdd,
      spacesToRemove,
      objects,
    });
    expect(result).toEqual({
      status: 'partially_authorized',
      typeMap: new Map()
        .set(multiSpaceObj1.type, {
          share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set(multiSpaceObj2.type, {
          share_to_space: { authorizedSpaces: ['x', ...spacesToAdd, ...spacesToRemove] },
          ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
    });
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`adds an audit event per object when successful`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

    await securityExtension.authorizeUpdateSpaces({
      namespace,
      spacesToAdd,
      spacesToRemove,
      objects,
    });

    expect(auditHelperSpy).toHaveBeenCalledTimes(1);
    expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
    expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
    let i = 1;
    for (const obj of objects) {
      expect(auditLogger.log).toHaveBeenNthCalledWith(i++, {
        error: undefined,
        event: {
          action: AuditAction.UPDATE_OBJECTS_SPACES,
          category: ['database'],
          outcome: 'unknown',
          type: ['change'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          saved_object: { type: obj.type, id: obj.id },
        },
        message: `User is updating spaces of ${obj.type} [id=${obj.id}]`,
      });
    }
  });

  test(`throws when unauthorized`, async () => {
    const { securityExtension, checkPrivileges } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/share_to_space', authorized: true },
          { privilege: 'login:', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeUpdateSpaces({
        namespace,
        spacesToAdd,
        spacesToRemove,
        objects,
      })
    ).rejects.toThrow(`Unable to share_to_space ${multiSpaceObj2.type}`);
    expect(enforceAuthorizationSpy).toHaveBeenCalledTimes(1);
  });

  test(`adds an audit event per object when unauthorized`, async () => {
    const { securityExtension, checkPrivileges, auditLogger } = setup();
    checkPrivileges.mockResolvedValue({
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/share_to_space', authorized: false },
          { privilege: 'login:', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse);

    await expect(
      securityExtension.authorizeUpdateSpaces({
        namespace,
        spacesToAdd,
        spacesToRemove,
        objects,
      })
    ).rejects.toThrow(`Unable to share_to_space ${multiSpaceObj1.type},${multiSpaceObj2.type}`);
    expect(auditHelperSpy).toHaveBeenCalledTimes(1);
    expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
    expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
    let i = 1;
    for (const obj of objects) {
      expect(auditLogger.log).toHaveBeenNthCalledWith(i++, {
        error: {
          code: 'Error',
          message: `Unable to share_to_space ${multiSpaceObj1.type},${multiSpaceObj2.type}`,
        },
        event: {
          action: AuditAction.UPDATE_OBJECTS_SPACES,
          category: ['database'],
          outcome: 'failure',
          type: ['change'],
        },
        kibana: {
          add_to_spaces: spacesToAdd,
          delete_from_spaces: spacesToRemove,
          saved_object: { type: obj.type, id: obj.id },
        },
        message: `Failed attempt to update spaces of ${obj.type} [id=${obj.id}]`,
      });
    }
  });
});

describe('find', () => {
  const namespace = 'x';
  const actionString = 'find';
  const fullyAuthorizedCheckPrivilegesResponse = {
    hasAllRequested: true,
    privileges: {
      kibana: [
        { privilege: 'mock-saved_object:a/find', authorized: true },
        { privilege: 'login:', authorized: true },
      ],
    },
  } as CheckPrivilegesResponse;

  const expectedTypes = new Set([obj1.type]);
  const expectedSpaces = new Set([namespace]);
  const expectedTypeMap = new Map().set('a', {
    find: { isGloballyAuthorized: true, authorizedSpaces: [] },
    ['login:']: { isGloballyAuthorized: true, authorizedSpaces: [] },
  });

  beforeEach(() => {
    checkAuthorizationSpy.mockClear();
    enforceAuthorizationSpy.mockClear();
    redactNamespacesSpy.mockClear();
    authorizeSpy.mockClear();
    auditHelperSpy.mockClear();
    addAuditEventSpy.mockClear();
  });

  describe(`#authorizeFind`, () => {
    test('throws an error when `namespaces` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeFind({
          namespaces: new Set(),
          types: expectedTypes,
        })
      ).rejects.toThrowError('No spaces specified for authorization');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when `types` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await expect(
        securityExtension.authorizeFind({
          namespaces: expectedSpaces,
          types: new Set(),
        })
      ).rejects.toThrowError('No types specified for authorization');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.authorizeFind({ namespaces: expectedSpaces, types: expectedTypes })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls authorize methods with expected actions, types, spaces, and no enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await securityExtension.authorizeFind({
        namespaces: expectedSpaces,
        types: expectedTypes,
      });

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: new Set([SecurityAction.FIND]),
        types: expectedTypes,
        spaces: expectedSpaces,
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: expectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });

      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [`mock-saved_object:${obj1.type}/${actionString}`, 'login:'],
        [...expectedSpaces]
      );

      expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
    });

    test(`returns result when fully authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      const result = await securityExtension.authorizeFind({
        namespaces: expectedSpaces,
        types: expectedTypes,
      });
      expect(result).toEqual({
        status: 'fully_authorized',
        typeMap: expectedTypeMap,
      });
      expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
    });

    test(`returns result when partially authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue({
        hasAllRequested: false,
        privileges: {
          kibana: [
            { privilege: 'mock-saved_object:a/find', authorized: true },
            { privilege: 'login:', authorized: false },
          ],
        },
      } as CheckPrivilegesResponse);

      const result = await securityExtension.authorizeFind({
        namespaces: expectedSpaces,
        types: expectedTypes,
      });
      expect(result).toEqual({
        status: 'partially_authorized',
        typeMap: new Map().set(obj1.type, {
          find: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      });
      expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
    });

    test(`does not add audit event when successful`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await securityExtension.authorizeFind({
        namespaces: expectedSpaces,
        types: expectedTypes,
      });

      expect(auditHelperSpy).not.toHaveBeenCalled(); // The helper is not called, as authorizeFind calls the addAudit method directly
      expect(addAuditEventSpy).not.toHaveBeenCalled();
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    test(`returns result when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'find', false);

      const result = await securityExtension.authorizeFind({
        namespaces: expectedSpaces,
        types: expectedTypes,
      });
      expect(result).toEqual({
        status: 'unauthorized',
        typeMap: new Map().set(obj1.type, {
          'login:': { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      });
      expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
    });

    test(`adds audit event when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'find', false);

      await securityExtension.authorizeFind({
        namespaces: expectedSpaces,
        types: expectedTypes,
      });
      expect(auditHelperSpy).not.toHaveBeenCalled();
      expect(addAuditEventSpy).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log).toHaveBeenCalledWith({
        error: { code: 'Error', message: `User is unauthorized for any requested types/spaces.` },
        event: {
          action: AuditAction.FIND,
          category: ['database'],
          outcome: 'failure',
          type: ['access'],
        },
        kibana: {
          add_to_spaces: undefined,
          delete_from_spaces: undefined,
          saved_object: undefined,
        },
        message: `Failed attempt to access saved objects`,
      });
    });
  });

  describe(`#getFindRedactTypeMap`, () => {
    const existingNamespaces = [namespace, 'y', 'z', 'foo'];
    const objects = [
      { type: obj1.type, id: obj1.id, existingNamespaces: [namespace, 'y'] },
      { type: obj1.type, id: obj2.id, existingNamespaces: [namespace, 'z'] },
      { type: obj1.type, id: obj3.id, existingNamespaces: [namespace, 'foo'] },
    ];

    const partiallyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: false,
      privileges: {
        kibana: [
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:a/find', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:a/find', authorized: false },
          { resource: 'z', privilege: 'mock-saved_object:a/find', authorized: true },
          { resource: 'foo', privilege: 'mock-saved_object:a/find', authorized: false },
        ],
      },
    } as CheckPrivilegesResponse;

    test('throws an error when `types` is empty', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await expect(
        securityExtension.getFindRedactTypeMap({
          authorizeNamespaces: expectedSpaces,
          types: new Set(),
          objects: [{ type: obj1.type, id: obj1.id, existingNamespaces }],
        })
      ).rejects.toThrowError('No types specified for authorization');
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('throws an error when checkAuthorization fails', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockRejectedValue(new Error('Oh no!'));

      await expect(
        securityExtension.getFindRedactTypeMap({
          authorizeNamespaces: expectedSpaces,
          types: expectedTypes,
          objects: [{ type: obj1.type, id: obj1.id, existingNamespaces }],
        })
      ).rejects.toThrowError('Oh no!');
    });

    test(`calls authorize methods with expected actions, types, spaces, and no enforce map`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      await securityExtension.getFindRedactTypeMap({
        authorizeNamespaces: expectedSpaces,
        types: expectedTypes,
        objects,
      });

      const updateExpectedSpaces = new Set(existingNamespaces);

      expect(authorizeSpy).toHaveBeenCalledTimes(1);
      expect(authorizeSpy).toHaveBeenCalledWith({
        actions: new Set([SecurityAction.FIND]),
        types: expectedTypes,
        spaces: updateExpectedSpaces,
      });

      expect(checkAuthorizationSpy).toHaveBeenCalledTimes(1);
      expect(checkAuthorizationSpy).toHaveBeenCalledWith({
        actions: new Set([actionString]),
        spaces: updateExpectedSpaces,
        types: expectedTypes,
        options: { allowGlobalResource: false },
      });

      expect(checkPrivileges).toHaveBeenCalledTimes(1);
      expect(checkPrivileges).toHaveBeenCalledWith(
        [`mock-saved_object:${obj1.type}/${actionString}`, 'login:'],
        [...updateExpectedSpaces]
      );

      expect(enforceAuthorizationSpy).not.toHaveBeenCalled();
    });

    test('returns undefined if there are no additional spaces', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      const result = await securityExtension.getFindRedactTypeMap({
        authorizeNamespaces: expectedSpaces,
        types: expectedTypes,
        objects: [{ type: obj1.type, id: obj1.id, existingNamespaces: [namespace] }],
      });
      expect(result).toBeUndefined();
    });

    test(`returns result when fully authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      const result = await securityExtension.getFindRedactTypeMap({
        authorizeNamespaces: expectedSpaces,
        types: expectedTypes,
        objects,
      });

      expect(result).toEqual(expectedTypeMap);
    });

    test(`returns result when partially authorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(partiallyAuthorizedCheckPrivilegesResponse);

      const result = await securityExtension.getFindRedactTypeMap({
        authorizeNamespaces: expectedSpaces,
        types: expectedTypes,
        objects,
      });

      expect(result).toEqual(
        new Map().set('a', {
          find: { authorizedSpaces: ['x', 'z'] },
          'login:': { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
      );
    });

    test(`returns result when unauthorized`, async () => {
      const { securityExtension, checkPrivileges } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'find', false);

      const result = await securityExtension.getFindRedactTypeMap({
        authorizeNamespaces: expectedSpaces,
        types: expectedTypes,
        objects,
      });

      expect(result).toEqual(
        new Map().set(obj1.type, {
          'login:': { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
      );
    });

    test(`adds an audit event per object when unauthorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'find', false);

      await securityExtension.getFindRedactTypeMap({
        authorizeNamespaces: expectedSpaces,
        types: expectedTypes,
        objects,
      });

      expect(auditHelperSpy).not.toHaveBeenCalled(); // The helper is not called, as getFindRedactTypeMap calls the addAudit method directly
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.FIND,
            category: ['database'],
            outcome: 'success',
            type: ['access'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: { type: obj.type, id: obj.id },
          },
          message: `User has accessed ${obj.type} [id=${obj.id}]`,
        });
      }
    });

    test(`adds an audit event per object when authorized`, async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      setupSimpleCheckPrivsMockResolve(checkPrivileges, obj1.type, 'find', true);

      await securityExtension.getFindRedactTypeMap({
        authorizeNamespaces: expectedSpaces,
        types: expectedTypes,
        objects,
      });

      expect(auditHelperSpy).not.toHaveBeenCalled(); // The helper is not called, as getFindRedactTypeMap calls the addAudit method directly
      expect(addAuditEventSpy).toHaveBeenCalledTimes(objects.length);
      expect(auditLogger.log).toHaveBeenCalledTimes(objects.length);
      for (const obj of objects) {
        expect(auditLogger.log).toHaveBeenCalledWith({
          error: undefined,
          event: {
            action: AuditAction.FIND,
            category: ['database'],
            outcome: 'success',
            type: ['access'],
          },
          kibana: {
            add_to_spaces: undefined,
            delete_from_spaces: undefined,
            saved_object: { type: obj.type, id: obj.id },
          },
          message: `User has accessed ${obj.type} [id=${obj.id}]`,
        });
      }
    });
  });
});
