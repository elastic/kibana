/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthorizeCreateObject } from '@kbn/core-saved-objects-server';
import { AuditAction, SecurityAction } from '@kbn/core-saved-objects-server';
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

describe('#performAuthorization', () => {
  describe('without enforce', () => {
    // These arguments are used for all unit tests below
    const types = new Set(['a', 'b', 'c']);
    const spaces = new Set(['x', 'y']);
    const actions = new Set([SecurityAction.CREATE, SecurityAction.UPDATE]);

    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/create', authorized: true },
          { privilege: 'mock-saved_object:a/update', authorized: true },
          { privilege: 'login:', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/create', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:b/update', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:c/create', authorized: true },
          { resource: 'x', privilege: 'mock-saved_object:c/update', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/create', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:b/update', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:c/create', authorized: true },
          { resource: 'y', privilege: 'mock-saved_object:c/update', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;
    test('calls checkPrivileges with expected privilege actions and namespaces', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error

      await securityExtension.performAuthorization({ types, spaces, actions });
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
      const { securityExtension, checkPrivileges, auditLogger } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse);

      const result = await securityExtension.performAuthorization({ types, spaces, actions });

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

      // We're performing authz but no enforce, therefore no audit
      expect(auditLogger.log).not.toHaveBeenCalled();
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

      const result = await securityExtension.performAuthorization({ types, spaces, actions });
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

      // We're performing authz but no enforce, therefore no audit
      expect(auditLogger.log).not.toHaveBeenCalled();
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

      // We're performing authz but no enforce, therefore no audit
      expect(auditLogger.log).not.toHaveBeenCalled();
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

      const result = await securityExtension.performAuthorization({ types, spaces, actions });
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

        await securityExtension.performAuthorization({
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

        await securityExtension.performAuthorization({
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

        await securityExtension.performAuthorization({
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

        await securityExtension.performAuthorization({
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

        await securityExtension.performAuthorization({
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

        await securityExtension.performAuthorization({
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
          securityExtension.performAuthorization({
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
          securityExtension.performAuthorization({
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
          securityExtension.performAuthorization({
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
          securityExtension.performAuthorization({
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
          securityExtension.performAuthorization({
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
          securityExtension.performAuthorization({
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

      await securityExtension.performAuthorization({
        types,
        spaces,
        actions: new Set([SecurityAction.CLOSE_POINT_IN_TIME]), // this is currently the only security action that does not require authz
      });
      expect(checkPrivileges).not.toHaveBeenCalled();
    });

    test('adds an audit event by default', async () => {
      const { securityExtension, checkPrivileges, auditLogger } = setup();

      await securityExtension.performAuthorization({
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

      await securityExtension.performAuthorization({
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

      await securityExtension.performAuthorization({
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

      await securityExtension.performAuthorization({
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

      await securityExtension.performAuthorization({
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

      await securityExtension.performAuthorization({
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
        securityExtension.performAuthorization({
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
        securityExtension.performAuthorization({
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

describe('#authorizeCreate', () => {
  describe(`for create action`, () => {
    const fullyAuthorizedCheckPrivilegesResponse = {
      hasAllRequested: true,
      privileges: {
        kibana: [
          { privilege: 'mock-saved_object:a/create', authorized: true },
          { privilege: 'login:', authorized: true },
        ],
      },
    } as CheckPrivilegesResponse;

    const namespace = 'x';

    const obj1: AuthorizeCreateObject = {
      type: 'a',
      id: '6.0.0-alpha1',
      initialNamespaces: ['foo'],
      existingNamespaces: undefined,
    };
    test('calls performAuthorization with expected actions, types, spaces, and enforce map', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error
      jest.spyOn(securityExtension, 'performAuthorization');

      await securityExtension.authorizeCreate({
        namespaceString: namespace,
        objects: [obj1],
      });

      expect(securityExtension.performAuthorization).toHaveBeenCalledTimes(1);
      const expectedActions = new Set([SecurityAction.CREATE]);
      const expectedSpaces = new Set([namespace, ...obj1.initialNamespaces!]);
      const expectedTypes = new Set([obj1.type]);
      const expectedEnforceMap = new Map<string, Set<string>>();
      expectedEnforceMap.set(obj1.type, new Set([namespace, ...obj1.initialNamespaces!]));

      expect(securityExtension.performAuthorization).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        options: { allowGlobalResource: true },
        auditOptions: {
          objects: [
            {
              type: obj1.type,
              id: obj1.id,
              initialNamespaces: obj1.initialNamespaces,
              existingNamespaces: undefined,
            },
          ],
        },
      });
    });
  });

  describe(`for bulk create action`, () => {
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
    const namespace = 'x';

    const obj1: AuthorizeCreateObject = {
      type: 'a',
      id: '6.0.0-alpha1',
      initialNamespaces: ['foo'],
      existingNamespaces: undefined,
    };
    const obj2: AuthorizeCreateObject = {
      type: 'b',
      id: 'logstash-*',
      initialNamespaces: undefined,
      existingNamespaces: undefined,
    };
    const obj3: AuthorizeCreateObject = {
      type: 'c',
      id: '6.0.0-charlie3',
      initialNamespaces: undefined,
      existingNamespaces: ['bar'],
    };
    const obj4: AuthorizeCreateObject = {
      type: 'd',
      id: '6.0.0-disco4',
      initialNamespaces: ['y'],
      existingNamespaces: ['z'],
    };

    test('calls performAuthorization with expected actions, types, spaces, and enforce map', async () => {
      const { securityExtension, checkPrivileges } = setup();
      checkPrivileges.mockResolvedValue(fullyAuthorizedCheckPrivilegesResponse); // Return any well-formed response to avoid an unhandled error
      jest.spyOn(securityExtension, 'performAuthorization');

      const objects = [obj1, obj2, obj3, obj4];
      await securityExtension.authorizeCreate({
        namespaceString: namespace,
        objects,
      });

      expect(securityExtension.performAuthorization).toHaveBeenCalledTimes(1);
      const expectedActions = new Set([SecurityAction.BULK_CREATE]);
      const expectedSpaces = new Set([
        namespace,
        ...obj1.initialNamespaces!,
        ...obj3.existingNamespaces!,
        ...obj4.initialNamespaces!,
        ...obj4.existingNamespaces!,
      ]);
      const expectedTypes = new Set(objects.map((obj) => obj.type));
      const expectedEnforceMap = new Map<string, Set<string>>();
      expectedEnforceMap.set(obj1.type, new Set([namespace, ...obj1.initialNamespaces!])); // existing namespace are authorized but not enforced
      expectedEnforceMap.set(obj2.type, new Set([namespace]));
      expectedEnforceMap.set(obj3.type, new Set([namespace]));
      expectedEnforceMap.set(obj4.type, new Set([namespace, ...obj4.initialNamespaces!]));

      expect(securityExtension.performAuthorization).toHaveBeenCalledWith({
        actions: expectedActions,
        types: expectedTypes,
        spaces: expectedSpaces,
        enforceMap: expectedEnforceMap,
        options: { allowGlobalResource: true },
        auditOptions: {
          objects,
        },
      });
    });
  });
});
