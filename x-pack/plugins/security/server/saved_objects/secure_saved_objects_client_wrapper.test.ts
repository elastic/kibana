/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockEnsureAuthorized } from './secure_saved_objects_client_wrapper.test.mocks';

import type {
  EcsEventOutcome,
  SavedObject,
  SavedObjectReferenceWithContext,
  SavedObjectsClientContract,
  SavedObjectsResolveResponse,
  SavedObjectsUpdateObjectsSpacesResponseObject,
} from 'src/core/server';
import { savedObjectsClientMock } from 'src/core/server/mocks';

import type { AuditEvent } from '../audit';
import { auditLoggerMock } from '../audit/mocks';
import { Actions } from '../authorization';
import type { SavedObjectActions } from '../authorization/actions/saved_object';
import { SecureSavedObjectsClientWrapper } from './secure_saved_objects_client_wrapper';

jest.mock('src/core/server/saved_objects/service/lib/utils', () => {
  const { SavedObjectsUtils } = jest.requireActual(
    'src/core/server/saved_objects/service/lib/utils'
  );
  return {
    SavedObjectsUtils: {
      ...SavedObjectsUtils,
      createEmptyFindResponse: SavedObjectsUtils.createEmptyFindResponse,
      generateId: () => 'mock-saved-object-id',
    },
  };
});

let clientOpts: ReturnType<typeof createSecureSavedObjectsClientWrapperOptions>;
let client: SecureSavedObjectsClientWrapper;
const USERNAME = Symbol();

const createSecureSavedObjectsClientWrapperOptions = () => {
  const actions = new Actions('some-version');
  jest
    .spyOn(actions.savedObject, 'get')
    .mockImplementation((type: string, action: string) => `mock-saved_object:${type}/${action}`);

  const forbiddenError = new Error('Mock ForbiddenError');
  const generalError = new Error('Mock GeneralError');

  const errors = {
    decorateForbiddenError: jest.fn().mockReturnValue(forbiddenError),
    decorateGeneralError: jest.fn().mockReturnValue(generalError),
    createBadRequestError: jest.fn().mockImplementation((message) => new Error(message)),
    isNotFoundError: jest.fn().mockReturnValue(false),
  } as unknown as jest.Mocked<SavedObjectsClientContract['errors']>;
  const getSpacesService = jest.fn().mockReturnValue({
    namespaceToSpaceId: (namespace?: string) => (namespace ? namespace : 'default'),
  });

  return {
    actions,
    baseClient: savedObjectsClientMock.create(),
    checkSavedObjectsPrivilegesAsCurrentUser: jest.fn(),
    errors,
    getSpacesService,
    auditLogger: auditLoggerMock.create(),
    forbiddenError,
    generalError,
  };
};

const expectGeneralError = async (fn: Function, args: Record<string, any>) => {
  // mock the checkPrivileges.globally rejection
  const rejection = new Error('An actual error would happen here');
  clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(rejection);

  await expect(fn.bind(client)(...Object.values(args))).rejects.toThrowError(
    clientOpts.generalError
  );
  expect(clientOpts.errors.decorateGeneralError).toHaveBeenCalledTimes(1);
};

/**
 * Fails the first authorization check, passes any others
 * Requires that function args are passed in as key/value pairs
 * The argument properties must be in the correct order to be spread properly
 */
const expectForbiddenError = async (fn: Function, args: Record<string, any>, action?: string) => {
  clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
    getMockCheckPrivilegesFailure
  );

  await expect(fn.bind(client)(...Object.values(args))).rejects.toThrowError(
    clientOpts.forbiddenError
  );

  expect(clientOpts.errors.decorateForbiddenError).toHaveBeenCalledTimes(1);
};

const expectSuccess = async (fn: Function, args: Record<string, any>, action?: string) => {
  return await fn.bind(client)(...Object.values(args));
};

const expectPrivilegeCheck = async (
  fn: Function,
  args: Record<string, any>,
  namespaceOrNamespaces: string | undefined | Array<undefined | string>
) => {
  clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
    getMockCheckPrivilegesFailure
  );

  await expect(fn.bind(client)(...Object.values(args))).rejects.toThrow(); // test is simpler with error case
  const getResults = (
    clientOpts.actions.savedObject.get as jest.MockedFunction<SavedObjectActions['get']>
  ).mock.results;
  const actions = getResults.map((x) => x.value);

  expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledTimes(1);
  expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
    actions,
    namespaceOrNamespaces
  );
};

const expectObjectNamespaceFiltering = async (
  fn: Function,
  args: Record<string, any>,
  privilegeChecks = 1
) => {
  for (let i = 0; i < privilegeChecks; i++) {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementationOnce(
      getMockCheckPrivilegesSuccess // privilege check for authorization
    );
  }
  clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
    getMockCheckPrivilegesFailure // privilege check for namespace filtering
  );

  const authorizedNamespace = args.options?.namespace || 'default';
  const namespaces = ['some-other-namespace', '*', authorizedNamespace];
  const returnValue = { namespaces, foo: 'bar' };
  // we don't know which base client method will be called; mock them all
  clientOpts.baseClient.create.mockReturnValue(returnValue as any);
  clientOpts.baseClient.get.mockReturnValue(returnValue as any);
  // 'resolve' is excluded because it has a specific test case written for it
  clientOpts.baseClient.update.mockReturnValue(returnValue as any);

  const result = await fn.bind(client)(...Object.values(args));
  // we will never redact the "All Spaces" ID
  expect(result).toEqual(expect.objectContaining({ namespaces: ['*', authorizedNamespace, '?'] }));

  expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledTimes(
    privilegeChecks + 1
  );
  expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenLastCalledWith(
    'login:',
    ['some-other-namespace']
    // when we check what namespaces to redact, we don't check privileges for '*', only actual space IDs
    // we don't check privileges for authorizedNamespace either, as that was already checked earlier in the operation
  );
};

const expectAuditEvent = (
  action: string,
  outcome: EcsEventOutcome,
  savedObject?: Required<AuditEvent>['kibana']['saved_object']
) => {
  expect(clientOpts.auditLogger.log).toHaveBeenCalledWith(
    expect.objectContaining({
      event: expect.objectContaining({
        action,
        outcome,
      }),
      kibana: savedObject
        ? expect.objectContaining({
            saved_object: { type: savedObject.type, id: savedObject.id },
          })
        : expect.anything(),
    })
  );
};

const expectObjectsNamespaceFiltering = async (fn: Function, args: Record<string, any>) => {
  clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementationOnce(
    getMockCheckPrivilegesSuccess // privilege check for authorization
  );
  clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
    getMockCheckPrivilegesFailure // privilege check for namespace filtering
  );

  // the 'find' operation has options.namespaces, the others have options.namespace
  const authorizedNamespaces =
    args.options.namespaces ?? (args.options.namespace ? [args.options.namespace] : ['default']);
  const returnValue = {
    saved_objects: [
      { namespaces: ['*'] },
      { namespaces: authorizedNamespaces },
      { namespaces: ['some-other-namespace', ...authorizedNamespaces] },
    ],
  };

  // we don't know which base client method will be called; mock them all
  clientOpts.baseClient.bulkCreate.mockReturnValue(returnValue as any);
  clientOpts.baseClient.bulkGet.mockReturnValue(returnValue as any);
  clientOpts.baseClient.bulkUpdate.mockReturnValue(returnValue as any);
  clientOpts.baseClient.find.mockReturnValue(returnValue as any);

  const result = await fn.bind(client)(...Object.values(args));
  expect(result).toEqual({
    saved_objects: [
      { namespaces: ['*'] },
      { namespaces: authorizedNamespaces },
      { namespaces: [...authorizedNamespaces, '?'] },
    ],
  });

  expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledTimes(2);
  expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenLastCalledWith(
    'login:',
    ['some-other-namespace']
    // when we check what namespaces to redact, we don't check privileges for '*', only actual space IDs
    // we don't check privileges for authorizedNamespaces either, as that was already checked earlier in the operation
  );
};

function getMockCheckPrivilegesSuccess(actions: string | string[], namespaces?: string | string[]) {
  const _namespaces = Array.isArray(namespaces) ? namespaces : [namespaces || 'default'];
  const _actions = Array.isArray(actions) ? actions : [actions];
  return {
    hasAllRequested: true,
    username: USERNAME,
    privileges: {
      kibana: _namespaces
        .map((resource) =>
          _actions.map((action) => ({
            resource,
            privilege: action,
            authorized: true,
          }))
        )
        .flat(),
    },
  };
}

/**
 * Fails the authorization check for the first privilege, and passes any others
 * This check may be for an action for two different types in the same namespace
 * Or, it may be for an action for the same type in two different namespaces
 * Either way, the first privilege check returned is false, and any others return true
 */
function getMockCheckPrivilegesFailure(actions: string | string[], namespaces?: string | string[]) {
  const _namespaces = Array.isArray(namespaces) ? namespaces : [namespaces || 'default'];
  const _actions = Array.isArray(actions) ? actions : [actions];
  return {
    hasAllRequested: false,
    username: USERNAME,
    privileges: {
      kibana: _namespaces
        .map((resource, idxa) =>
          _actions.map((action, idxb) => ({
            resource,
            privilege: action,
            authorized: idxa > 0 || idxb > 0,
          }))
        )
        .flat(),
    },
  };
}

/**
 * Before each test, create the Client with its Options
 */
beforeEach(() => {
  clientOpts = createSecureSavedObjectsClientWrapperOptions();
  client = new SecureSavedObjectsClientWrapper(clientOpts);

  // succeed legacyEnsureAuthorized privilege checks by default
  clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
    getMockCheckPrivilegesSuccess
  );

  mockEnsureAuthorized.mockReset();
});

describe('#bulkCreate', () => {
  const attributes = { some: 'attr' };
  const obj1 = Object.freeze({ type: 'foo', id: 'sup', attributes });
  const obj2 = Object.freeze({ type: 'bar', id: 'everyone', attributes });
  const namespace = 'some-ns';

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    const objects = [obj1];
    await expectGeneralError(client.bulkCreate, { objects });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const objects = [obj1, obj2];
    const options = { namespace };
    await expectForbiddenError(client.bulkCreate, { objects, options });
  });

  test(`returns result of baseClient.bulkCreate when authorized`, async () => {
    const apiCallReturnValue = { saved_objects: [], foo: 'bar' };
    clientOpts.baseClient.bulkCreate.mockReturnValue(apiCallReturnValue as any);

    const objects = [obj1, obj2];
    const options = { namespace };
    const result = await expectSuccess(client.bulkCreate, { objects, options });
    expect(result).toEqual(apiCallReturnValue);
  });

  test(`checks privileges for user, actions, and namespace`, async () => {
    const objects = [obj1, obj2];
    const options = { namespace };
    await expectPrivilegeCheck(client.bulkCreate, { objects, options }, [namespace]);
  });

  test(`checks privileges for user, actions, namespace, and initialNamespaces`, async () => {
    const objects = [
      { ...obj1, initialNamespaces: 'another-ns' },
      { ...obj2, initialNamespaces: 'yet-another-ns' },
    ];
    const options = { namespace };
    await expectPrivilegeCheck(client.bulkCreate, { objects, options }, [
      namespace,
      'another-ns',
      'yet-another-ns',
    ]);
  });

  test(`filters namespaces that the user doesn't have access to`, async () => {
    const objects = [obj1, obj2];
    const options = { namespace };
    await expectObjectsNamespaceFiltering(client.bulkCreate, { objects, options });
  });

  test(`adds audit event when successful`, async () => {
    const apiCallReturnValue = { saved_objects: [], foo: 'bar' };
    clientOpts.baseClient.bulkCreate.mockReturnValue(apiCallReturnValue as any);
    const objects = [obj1, obj2];
    const options = { namespace };
    await expectSuccess(client.bulkCreate, { objects, options });
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(2);
    expectAuditEvent('saved_object_create', 'unknown', { type: obj1.type, id: obj1.id });
    expectAuditEvent('saved_object_create', 'unknown', { type: obj2.type, id: obj2.id });
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.bulkCreate([obj1, obj2], { namespace })).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(2);
    expectAuditEvent('saved_object_create', 'failure', { type: obj1.type, id: obj1.id });
    expectAuditEvent('saved_object_create', 'failure', { type: obj2.type, id: obj2.id });
  });
});

describe('#bulkGet', () => {
  const obj1 = Object.freeze({ type: 'foo', id: 'foo-id' });
  const obj2 = Object.freeze({ type: 'bar', id: 'bar-id' });
  const namespace = 'some-ns';

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    const objects = [obj1];
    await expectGeneralError(client.bulkGet, { objects });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const objects = [obj1, obj2];
    const options = { namespace };
    await expectForbiddenError(client.bulkGet, { objects, options });
  });

  test(`returns result of baseClient.bulkGet when authorized`, async () => {
    const apiCallReturnValue = { saved_objects: [], foo: 'bar' };
    clientOpts.baseClient.bulkGet.mockReturnValue(apiCallReturnValue as any);

    const objects = [obj1, obj2];
    const options = { namespace };
    const result = await expectSuccess(client.bulkGet, { objects, options });
    expect(result).toEqual(apiCallReturnValue);
  });

  test(`checks privileges for user, actions, namespace, and (object) namespaces`, async () => {
    const objects = [
      { ...obj1, namespaces: ['another-ns'] },
      { ...obj2, namespaces: ['yet-another-ns'] },
    ];
    const options = { namespace };
    await expectPrivilegeCheck(client.bulkGet, { objects, options }, [
      namespace,
      'another-ns',
      'yet-another-ns',
    ]);
  });

  test(`filters namespaces that the user doesn't have access to`, async () => {
    const objects = [obj1, obj2];
    const options = { namespace };
    await expectObjectsNamespaceFiltering(client.bulkGet, { objects, options });
  });

  test(`adds audit event when successful`, async () => {
    const apiCallReturnValue = { saved_objects: [obj1, obj2], foo: 'bar' };
    clientOpts.baseClient.bulkGet.mockReturnValue(apiCallReturnValue as any);
    const objects = [obj1, obj2];
    const options = { namespace };
    await expectSuccess(client.bulkGet, { objects, options });
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(2);
    expectAuditEvent('saved_object_get', 'success', obj1);
    expectAuditEvent('saved_object_get', 'success', obj2);
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.bulkGet([obj1, obj2], { namespace })).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(2);
    expectAuditEvent('saved_object_get', 'failure', obj1);
    expectAuditEvent('saved_object_get', 'failure', obj2);
  });
});

describe('#bulkResolve', () => {
  const obj1 = Object.freeze({ type: 'foo', id: 'foo-id' });
  const obj2 = Object.freeze({ type: 'bar', id: 'bar-id' });
  const namespace = 'some-ns';

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    const objects = [obj1];
    await expectGeneralError(client.bulkResolve, { objects });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const objects = [obj1, obj2];
    const options = { namespace };
    await expectForbiddenError(client.bulkResolve, { objects, options }, 'bulk_resolve');
  });

  test(`returns result of baseClient.bulkResolve when authorized`, async () => {
    const apiCallReturnValue = { resolved_objects: [] };
    clientOpts.baseClient.bulkResolve.mockResolvedValue(apiCallReturnValue);

    const objects = [obj1, obj2];
    const options = { namespace };
    const result = await expectSuccess(client.bulkResolve, { objects, options }, 'bulk_resolve');
    expect(result).toEqual(apiCallReturnValue);
  });

  test(`checks privileges for user, actions, and namespace`, async () => {
    const objects = [obj1, obj2];
    const options = { namespace };
    await expectPrivilegeCheck(client.bulkResolve, { objects, options }, namespace);
  });

  test(`filters namespaces that the user doesn't have access to`, async () => {
    const objects = [obj1, obj2];
    const options = { namespace };

    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementationOnce(
      getMockCheckPrivilegesSuccess // privilege check for authorization
    );
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
      getMockCheckPrivilegesFailure // privilege check for namespace filtering
    );

    clientOpts.baseClient.bulkResolve.mockResolvedValue({
      resolved_objects: [
        // omit other fields from the SavedObjectsResolveResponse such as outcome, as they are not needed for this test case
        { saved_object: { namespaces: ['*'] } } as unknown as SavedObjectsResolveResponse,
        { saved_object: { namespaces: [namespace] } } as unknown as SavedObjectsResolveResponse,
        {
          saved_object: { namespaces: ['some-other-namespace', namespace] },
        } as unknown as SavedObjectsResolveResponse,
      ],
    });

    const result = await client.bulkResolve(objects, options);
    expect(result).toEqual({
      resolved_objects: [
        { saved_object: { namespaces: ['*'] } },
        { saved_object: { namespaces: [namespace] } },
        { saved_object: { namespaces: [namespace, '?'] } },
      ],
    });

    expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledTimes(2);
    expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenLastCalledWith(
      'login:',
      ['some-other-namespace']
      // when we check what namespaces to redact, we don't check privileges for '*', only actual space IDs
      // we don't check privileges for authorizedNamespaces either, as that was already checked earlier in the operation
    );
  });

  test(`adds audit event when successful`, async () => {
    const apiCallReturnValue = {
      resolved_objects: [
        { saved_object: obj1 } as unknown as SavedObjectsResolveResponse,
        { saved_object: obj2 } as unknown as SavedObjectsResolveResponse,
      ],
    };
    clientOpts.baseClient.bulkResolve.mockResolvedValue(apiCallReturnValue);
    const objects = [obj1, obj2];
    const options = { namespace };
    await expectSuccess(client.bulkResolve, { objects, options }, 'bulk_resolve');
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(2);
    expectAuditEvent('saved_object_resolve', 'success', obj1);
    expectAuditEvent('saved_object_resolve', 'success', obj2);
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.bulkResolve([obj1, obj2], { namespace })).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(2);
    expectAuditEvent('saved_object_resolve', 'failure', obj1);
    expectAuditEvent('saved_object_resolve', 'failure', obj2);
  });
});

describe('#bulkUpdate', () => {
  const obj1 = Object.freeze({ type: 'foo', id: 'foo-id', attributes: { some: 'attr' } });
  const obj2 = Object.freeze({ type: 'bar', id: 'bar-id', attributes: { other: 'attr' } });
  const namespace = 'some-ns';

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    const objects = [obj1];
    await expectGeneralError(client.bulkUpdate, { objects });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const objects = [obj1, obj2];
    const options = { namespace };
    await expectForbiddenError(client.bulkUpdate, { objects, options });
  });

  test(`returns result of baseClient.bulkUpdate when authorized`, async () => {
    const apiCallReturnValue = { saved_objects: [], foo: 'bar' };
    clientOpts.baseClient.bulkUpdate.mockReturnValue(apiCallReturnValue as any);

    const objects = [obj1, obj2];
    const options = { namespace };
    const result = await expectSuccess(client.bulkUpdate, { objects, options });
    expect(result).toEqual(apiCallReturnValue);
  });

  test(`checks privileges for user, actions, and namespace`, async () => {
    const objects = [obj1, obj2];
    const options = { namespace };
    const namespaces = [options.namespace]; // the bulkUpdate function always checks privileges as an array
    await expectPrivilegeCheck(client.bulkUpdate, { objects, options }, namespaces);
  });

  test(`checks privileges for object namespaces if present`, async () => {
    const objects = [
      { ...obj1, namespace: 'foo-ns' },
      { ...obj2, namespace: 'bar-ns' },
    ];
    const namespaces = [undefined, 'foo-ns', 'bar-ns'];
    const options = {}; // use the default namespace for the options
    await expectPrivilegeCheck(client.bulkUpdate, { objects, options }, namespaces);
  });

  test(`filters namespaces that the user doesn't have access to`, async () => {
    const objects = [obj1, obj2];
    const options = { namespace };
    await expectObjectsNamespaceFiltering(client.bulkUpdate, { objects, options });
  });

  test(`adds audit event when successful`, async () => {
    const apiCallReturnValue = { saved_objects: [], foo: 'bar' };
    clientOpts.baseClient.bulkUpdate.mockReturnValue(apiCallReturnValue as any);
    const objects = [obj1, obj2];
    const options = { namespace };
    await expectSuccess(client.bulkUpdate, { objects, options });
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(2);
    expectAuditEvent('saved_object_update', 'unknown', { type: obj1.type, id: obj1.id });
    expectAuditEvent('saved_object_update', 'unknown', { type: obj2.type, id: obj2.id });
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.bulkUpdate<any>([obj1, obj2], { namespace })).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(2);
    expectAuditEvent('saved_object_update', 'failure', { type: obj1.type, id: obj1.id });
    expectAuditEvent('saved_object_update', 'failure', { type: obj2.type, id: obj2.id });
  });
});

describe('#checkConflicts', () => {
  const obj1 = Object.freeze({ type: 'foo', id: 'foo-id' });
  const obj2 = Object.freeze({ type: 'bar', id: 'bar-id' });
  const namespace = 'some-ns';

  test(`throws decorated GeneralError when checkPrivileges.globally rejects promise`, async () => {
    const objects = [obj1, obj2];
    await expectGeneralError(client.checkConflicts, { objects });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const objects = [obj1, obj2];
    const options = { namespace };
    await expectForbiddenError(client.checkConflicts, { objects, options }, 'checkConflicts');
  });

  test(`returns result of baseClient.create when authorized`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.checkConflicts.mockResolvedValue(apiCallReturnValue as any);

    const objects = [obj1, obj2];
    const options = { namespace };
    const result = await expectSuccess(
      client.checkConflicts,
      { objects, options },
      'checkConflicts'
    );
    expect(result).toBe(apiCallReturnValue);
  });

  test(`checks privileges for user, actions, and namespace`, async () => {
    const objects = [obj1, obj2];
    const options = { namespace };
    await expectPrivilegeCheck(client.checkConflicts, { objects, options }, namespace);
  });
});

describe('#create', () => {
  const type = 'foo';
  const attributes = { some_attr: 's' };
  const namespace = 'some-ns';

  test(`throws decorated GeneralError when checkPrivileges.globally rejects promise`, async () => {
    await expectGeneralError(client.create, { type });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const options = { id: 'mock-saved-object-id', namespace };
    await expectForbiddenError(client.create, { type, attributes, options });
  });

  test(`returns result of baseClient.create when authorized`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.create.mockResolvedValue(apiCallReturnValue as any);

    const options = { id: 'mock-saved-object-id', namespace };
    const result = await expectSuccess(client.create, {
      type,
      attributes,
      options,
    });
    expect(result).toBe(apiCallReturnValue);
  });

  test(`checks privileges for user, actions, and namespace`, async () => {
    const options = { namespace };
    await expectPrivilegeCheck(client.create, { type, attributes, options }, [namespace]);
  });

  test(`checks privileges for user, actions, namespace, and initialNamespaces`, async () => {
    const options = { namespace, initialNamespaces: ['another-ns', 'yet-another-ns'] };
    await expectPrivilegeCheck(client.create, { type, attributes, options }, [
      namespace,
      'another-ns',
      'yet-another-ns',
    ]);
  });

  test(`filters namespaces that the user doesn't have access to`, async () => {
    const options = { namespace };
    await expectObjectNamespaceFiltering(client.create, { type, attributes, options });
  });

  test(`adds audit event when successful`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.create.mockResolvedValue(apiCallReturnValue as any);
    const options = { id: 'mock-saved-object-id', namespace };
    await expectSuccess(client.create, { type, attributes, options });
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_create', 'unknown', { type, id: expect.any(String) });
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.create(type, attributes, { namespace })).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_create', 'failure', { type, id: expect.any(String) });
  });
});

describe('#delete', () => {
  const type = 'foo';
  const id = `${type}-id`;
  const namespace = 'some-ns';

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    await expectGeneralError(client.delete, { type, id });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const options = { namespace };
    await expectForbiddenError(client.delete, { type, id, options });
  });

  test(`returns result of internalRepository.delete when authorized`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.delete.mockReturnValue(apiCallReturnValue as any);

    const options = { namespace };
    const result = await expectSuccess(client.delete, { type, id, options });
    expect(result).toBe(apiCallReturnValue);
  });

  test(`checks privileges for user, actions, and namespace`, async () => {
    const options = { namespace };
    await expectPrivilegeCheck(client.delete, { type, id, options }, namespace);
  });

  test(`adds audit event when successful`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.delete.mockReturnValue(apiCallReturnValue as any);
    const options = { namespace };
    await expectSuccess(client.delete, { type, id, options });
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_delete', 'unknown', { type, id });
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.delete(type, id)).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_delete', 'failure', { type, id });
  });
});

describe('#find', () => {
  const type1 = 'foo';
  const type2 = 'bar';
  const namespaces = ['some-ns'];

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    await expectGeneralError(client.find, { type: type1 });
  });

  test(`returns empty result when unauthorized`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
      getMockCheckPrivilegesFailure
    );

    const options = Object.freeze({ type: type1, namespaces: ['some-ns'] });
    const result = await client.find(options);

    expect(clientOpts.baseClient.find).not.toHaveBeenCalled();
    expect(result).toEqual({ page: 1, per_page: 20, total: 0, saved_objects: [] });
  });

  test(`returns result of baseClient.find when fully authorized`, async () => {
    const apiCallReturnValue = { saved_objects: [], foo: 'bar' };
    clientOpts.baseClient.find.mockReturnValue(apiCallReturnValue as any);

    const options = { type: type1, namespaces };
    const result = await expectSuccess(client.find, { options });
    expect(clientOpts.baseClient.find.mock.calls[0][0]).toEqual({
      ...options,
      typeToNamespacesMap: undefined,
    });
    expect(result).toEqual(apiCallReturnValue);
  });

  test(`returns result of baseClient.find when partially authorized`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
      hasAllRequested: false,
      username: USERNAME,
      privileges: {
        kibana: [
          { resource: 'some-ns', privilege: 'mock-saved_object:foo/find', authorized: true },
          { resource: 'some-ns', privilege: 'mock-saved_object:bar/find', authorized: true },
          { resource: 'some-ns', privilege: 'mock-saved_object:baz/find', authorized: false },
          { resource: 'some-ns', privilege: 'mock-saved_object:qux/find', authorized: false },
          { resource: 'another-ns', privilege: 'mock-saved_object:foo/find', authorized: true },
          { resource: 'another-ns', privilege: 'mock-saved_object:bar/find', authorized: false },
          { resource: 'another-ns', privilege: 'mock-saved_object:baz/find', authorized: true },
          { resource: 'another-ns', privilege: 'mock-saved_object:qux/find', authorized: false },
          { resource: 'forbidden-ns', privilege: 'mock-saved_object:foo/find', authorized: false },
          { resource: 'forbidden-ns', privilege: 'mock-saved_object:bar/find', authorized: false },
          { resource: 'forbidden-ns', privilege: 'mock-saved_object:baz/find', authorized: false },
          { resource: 'forbidden-ns', privilege: 'mock-saved_object:qux/find', authorized: false },
        ],
      },
    });

    const apiCallReturnValue = { saved_objects: [], foo: 'bar' };
    clientOpts.baseClient.find.mockReturnValue(apiCallReturnValue as any);

    const options = Object.freeze({
      type: ['foo', 'bar', 'baz', 'qux'],
      namespaces: ['some-ns', 'another-ns', 'forbidden-ns'],
    });
    const result = await client.find(options);
    // 'expect(clientOpts.baseClient.find).toHaveBeenCalledWith' resulted in false negatives, resorting to manually comparing mock call args
    expect(clientOpts.baseClient.find.mock.calls[0][0]).toEqual({
      ...options,
      typeToNamespacesMap: new Map([
        ['foo', ['some-ns', 'another-ns']],
        ['bar', ['some-ns']],
        ['baz', ['another-ns']],
        // qux is not authorized, so there is no entry for it
        // forbidden-ns is completely forbidden, so there are no entries with this namespace
      ]),
      type: '',
      namespaces: [],
    });
    expect(result).toEqual(apiCallReturnValue);
  });

  test(`throws BadRequestError when searching across namespaces when spaces is disabled`, async () => {
    clientOpts = createSecureSavedObjectsClientWrapperOptions();
    clientOpts.getSpacesService.mockReturnValue(undefined);
    client = new SecureSavedObjectsClientWrapper(clientOpts);

    // succeed privilege checks by default
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
      getMockCheckPrivilegesSuccess
    );

    const options = { type: [type1, type2], namespaces };
    await expect(client.find(options)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"_find across namespaces is not permitted when the Spaces plugin is disabled."`
    );
  });

  test(`checks privileges for user, actions, and namespaces`, async () => {
    const options = { type: [type1, type2], namespaces };
    await expectPrivilegeCheck(client.find, { options }, namespaces);
  });

  test(`filters namespaces that the user doesn't have access to`, async () => {
    const options = { type: [type1, type2], namespaces };
    await expectObjectsNamespaceFiltering(client.find, { options });
  });

  test(`adds audit event when successful`, async () => {
    const obj1 = { type: 'foo', id: 'sup' };
    const obj2 = { type: 'bar', id: 'everyone' };
    const apiCallReturnValue = { saved_objects: [obj1, obj2], foo: 'bar' };
    clientOpts.baseClient.find.mockReturnValue(apiCallReturnValue as any);
    const options = Object.freeze({ type: type1, namespaces: ['some-ns'] });
    await expectSuccess(client.find, { options });
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(2);
    expectAuditEvent('saved_object_find', 'success', obj1);
    expectAuditEvent('saved_object_find', 'success', obj2);
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
      getMockCheckPrivilegesFailure
    );
    await client.find({ type: type1 });
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_find', 'failure');
  });
});

describe('#get', () => {
  const type = 'foo';
  const id = `${type}-id`;
  const namespace = 'some-ns';

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    await expectGeneralError(client.get, { type, id });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const options = { namespace };
    await expectForbiddenError(client.get, { type, id, options });
  });

  test(`returns result of baseClient.get when authorized`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.get.mockReturnValue(apiCallReturnValue as any);

    const options = { namespace };
    const result = await expectSuccess(client.get, { type, id, options });
    expect(result).toBe(apiCallReturnValue);
  });

  test(`checks privileges for user, actions, and namespace`, async () => {
    const options = { namespace };
    await expectPrivilegeCheck(client.get, { type, id, options }, namespace);
  });

  test(`filters namespaces that the user doesn't have access to`, async () => {
    const options = { namespace };
    await expectObjectNamespaceFiltering(client.get, { type, id, options });
  });

  test(`adds audit event when successful`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.get.mockReturnValue(apiCallReturnValue as any);
    const options = { namespace };
    await expectSuccess(client.get, { type, id, options });
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_get', 'success', { type, id });
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.get(type, id, { namespace })).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_get', 'failure', { type, id });
  });
});

describe('#openPointInTimeForType', () => {
  const type = 'foo';
  const namespace = 'some-ns';

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    await expectGeneralError(client.openPointInTimeForType, { type });
  });

  test(`returns result of baseClient.openPointInTimeForType when authorized`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.openPointInTimeForType.mockReturnValue(apiCallReturnValue as any);

    const options = { namespaces: [namespace] };
    const result = await expectSuccess(client.openPointInTimeForType, { type, options });
    expect(result).toBe(apiCallReturnValue);
  });

  test(`adds audit event when successful`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.openPointInTimeForType.mockReturnValue(apiCallReturnValue as any);
    const options = { namespaces: [namespace] };
    await expectSuccess(client.openPointInTimeForType, { type, options });
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_open_point_in_time', 'unknown');
  });

  test(`throws an error when unauthorized`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
      getMockCheckPrivilegesFailure
    );
    const options = { namespaces: [namespace] };
    await expect(() => client.openPointInTimeForType(type, options)).rejects.toThrowError(
      'unauthorized'
    );
  });

  test(`adds audit event when unauthorized`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
      getMockCheckPrivilegesFailure
    );
    const options = { namespaces: [namespace] };
    await expect(() => client.openPointInTimeForType(type, options)).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_open_point_in_time', 'failure');
  });

  test(`filters types based on authorization`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
      hasAllRequested: false,
      username: USERNAME,
      privileges: {
        kibana: [
          {
            resource: 'some-ns',
            privilege: 'mock-saved_object:foo/open_point_in_time',
            authorized: true,
          },
          {
            resource: 'some-ns',
            privilege: 'mock-saved_object:bar/open_point_in_time',
            authorized: true,
          },
          {
            resource: 'some-ns',
            privilege: 'mock-saved_object:baz/open_point_in_time',
            authorized: false,
          },
          {
            resource: 'some-ns',
            privilege: 'mock-saved_object:qux/open_point_in_time',
            authorized: false,
          },
          {
            resource: 'another-ns',
            privilege: 'mock-saved_object:foo/open_point_in_time',
            authorized: true,
          },
          {
            resource: 'another-ns',
            privilege: 'mock-saved_object:bar/open_point_in_time',
            authorized: false,
          },
          {
            resource: 'another-ns',
            privilege: 'mock-saved_object:baz/open_point_in_time',
            authorized: true,
          },
          {
            resource: 'another-ns',
            privilege: 'mock-saved_object:qux/open_point_in_time',
            authorized: false,
          },
          {
            resource: 'forbidden-ns',
            privilege: 'mock-saved_object:foo/open_point_in_time',
            authorized: false,
          },
          {
            resource: 'forbidden-ns',
            privilege: 'mock-saved_object:bar/open_point_in_time',
            authorized: false,
          },
          {
            resource: 'forbidden-ns',
            privilege: 'mock-saved_object:baz/open_point_in_time',
            authorized: false,
          },
          {
            resource: 'forbidden-ns',
            privilege: 'mock-saved_object:qux/open_point_in_time',
            authorized: false,
          },
        ],
      },
    });

    await client.openPointInTimeForType(['foo', 'bar', 'baz', 'qux'], {
      namespaces: ['some-ns', 'another-ns', 'forbidden-ns'],
    });

    expect(clientOpts.baseClient.openPointInTimeForType).toHaveBeenCalledWith(
      ['foo', 'bar', 'baz'],
      {
        namespaces: ['some-ns', 'another-ns', 'forbidden-ns'],
      }
    );
  });
});

describe('#closePointInTime', () => {
  const id = 'abc123';
  const namespace = 'some-ns';

  test(`returns result of baseClient.closePointInTime`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.closePointInTime.mockReturnValue(apiCallReturnValue as any);

    const options = { namespace };
    const result = await client.closePointInTime(id, options);
    expect(result).toBe(apiCallReturnValue);
  });

  test(`adds audit event`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.closePointInTime.mockReturnValue(apiCallReturnValue as any);

    const options = { namespace };
    await client.closePointInTime(id, options);
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_close_point_in_time', 'unknown');
  });
});

describe('#createPointInTimeFinder', () => {
  it('redirects request to underlying base client with default dependencies', () => {
    const options = { type: ['a', 'b'], search: 'query' };
    client.createPointInTimeFinder(options);

    expect(clientOpts.baseClient.createPointInTimeFinder).toHaveBeenCalledTimes(1);
    expect(clientOpts.baseClient.createPointInTimeFinder).toHaveBeenCalledWith(options, {
      client,
    });
  });

  it('redirects request to underlying base client with custom dependencies', () => {
    const options = { type: ['a', 'b'], search: 'query' };
    const dependencies = {
      client: {
        find: jest.fn(),
        openPointInTimeForType: jest.fn(),
        closePointInTime: jest.fn(),
      },
    };
    client.createPointInTimeFinder(options, dependencies);

    expect(clientOpts.baseClient.createPointInTimeFinder).toHaveBeenCalledTimes(1);
    expect(clientOpts.baseClient.createPointInTimeFinder).toHaveBeenCalledWith(
      options,
      dependencies
    );
  });
});

describe('#resolve', () => {
  const type = 'foo';
  const id = `${type}-id`;
  const namespace = 'some-ns';
  const resolvedId = 'another-id'; // success audit records include the resolved ID, not the requested ID
  const mockResult = { saved_object: { id: resolvedId } }; // mock result needs to have ID for audit logging

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    await expectGeneralError(client.resolve, { type, id });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const options = { namespace };
    await expectForbiddenError(client.resolve, { type, id, options }, 'resolve');
  });

  test(`returns result of baseClient.resolve when authorized`, async () => {
    const apiCallReturnValue = mockResult;
    clientOpts.baseClient.resolve.mockReturnValue(apiCallReturnValue as any);

    const options = { namespace };
    const result = await expectSuccess(client.resolve, { type, id, options }, 'resolve');
    expect(result).toEqual(apiCallReturnValue);
  });

  test(`checks privileges for user, actions, and namespace`, async () => {
    const options = { namespace };
    await expectPrivilegeCheck(client.resolve, { type, id, options }, namespace);
  });

  test(`filters namespaces that the user doesn't have access to`, async () => {
    const options = { namespace };

    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementationOnce(
      getMockCheckPrivilegesSuccess // privilege check for authorization
    );
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
      getMockCheckPrivilegesFailure // privilege check for namespace filtering
    );

    const namespaces = ['some-other-namespace', '*', namespace];
    const returnValue = { saved_object: { namespaces, id: resolvedId, foo: 'bar' } };
    clientOpts.baseClient.resolve.mockReturnValue(returnValue as any);

    const result = await client.resolve(type, id, options);
    // we will never redact the "All Spaces" ID
    expect(result).toEqual({
      saved_object: expect.objectContaining({ namespaces: ['*', namespace, '?'] }),
    });

    expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledTimes(2);
    expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenLastCalledWith(
      'login:',
      ['some-other-namespace']
      // when we check what namespaces to redact, we don't check privileges for '*', only actual space IDs
      // we don't check privileges for authorizedNamespace either, as that was already checked earlier in the operation
    );
  });

  test(`adds audit event when successful`, async () => {
    const apiCallReturnValue = mockResult;
    clientOpts.baseClient.resolve.mockReturnValue(apiCallReturnValue as any);
    const options = { namespace };
    await expectSuccess(client.resolve, { type, id, options }, 'resolve');
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_resolve', 'success', { type, id: resolvedId });
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.resolve(type, id, { namespace })).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_resolve', 'failure', { type, id });
  });
});

describe('#update', () => {
  const type = 'foo';
  const id = `${type}-id`;
  const attributes = { some: 'attr' };
  const namespace = 'some-ns';

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    await expectGeneralError(client.update, { type, id, attributes });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const options = { namespace };
    await expectForbiddenError(client.update, { type, id, attributes, options });
  });

  test(`returns result of baseClient.update when authorized`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.update.mockReturnValue(apiCallReturnValue as any);

    const options = { namespace };
    const result = await expectSuccess(client.update, { type, id, attributes, options });
    expect(result).toBe(apiCallReturnValue);
  });

  test(`checks privileges for user, actions, and namespace`, async () => {
    const options = { namespace };
    await expectPrivilegeCheck(client.update, { type, id, attributes, options }, namespace);
  });

  test(`filters namespaces that the user doesn't have access to`, async () => {
    const options = { namespace };
    await expectObjectNamespaceFiltering(client.update, { type, id, attributes, options });
  });

  test(`adds audit event when successful`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.update.mockReturnValue(apiCallReturnValue as any);
    const options = { namespace };
    await expectSuccess(client.update, { type, id, attributes, options });
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_update', 'unknown', { type, id });
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.update(type, id, attributes, { namespace })).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_update', 'failure', { type, id });
  });
});

describe('#removeReferencesTo', () => {
  const type = 'foo';
  const id = `${type}-id`;
  const namespace = 'some-ns';
  const options = { namespace };

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    await expectGeneralError(client.removeReferencesTo, { type, id, options });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    await expectForbiddenError(
      client.removeReferencesTo,
      { type, id, options },
      'removeReferences'
    );
  });

  test(`returns result of baseClient.removeReferencesTo when authorized`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.removeReferencesTo.mockReturnValue(apiCallReturnValue as any);

    const result = await expectSuccess(
      client.removeReferencesTo,
      { type, id, options },
      'removeReferences'
    );
    expect(result).toBe(apiCallReturnValue);
  });

  test(`checks privileges for user, actions, and namespace`, async () => {
    await expectPrivilegeCheck(client.removeReferencesTo, { type, id, options }, namespace);
  });

  test(`adds audit event when successful`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.removeReferencesTo.mockReturnValue(apiCallReturnValue as any);
    await client.removeReferencesTo(type, id);

    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_remove_references', 'unknown', { type, id });
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.removeReferencesTo(type, id)).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_remove_references', 'failure', { type, id });
  });
});

/**
 * Naming conventions used in this group of tests:
 *   * 'reqObj' is an object that the consumer requests (SavedObjectsCollectMultiNamespaceReferencesObject)
 *   * 'obj' is the object result that was fetched from Elasticsearch (SavedObjectReferenceWithContext)
 */
describe('#collectMultiNamespaceReferences', () => {
  const AUDIT_ACTION = 'saved_object_collect_multinamespace_references';
  const spaceX = 'space-x';
  const spaceY = 'space-y';
  const spaceZ = 'space-z';

  /** Returns a valid inboundReferences field for mock baseClient results. */
  function getInboundRefsFrom(
    ...objects: Array<{ type: string; id: string }>
  ): Pick<SavedObjectReferenceWithContext, 'inboundReferences'> {
    return {
      inboundReferences: objects.map(({ type, id }) => {
        return { type, id, name: `ref-${type}:${id}` };
      }),
    };
  }

  beforeEach(() => {
    // by default, the result is a success, each object exists in the current space and another space
    clientOpts.baseClient.collectMultiNamespaceReferences.mockImplementation((objects) =>
      Promise.resolve({
        objects: objects.map<SavedObjectReferenceWithContext>(({ type, id }) => ({
          type,
          id,
          spaces: [spaceX, spaceY, spaceZ],
          inboundReferences: [],
        })),
      })
    );
  });

  describe('errors', () => {
    const reqObj1 = { type: 'a', id: '1' };
    const reqObj2 = { type: 'b', id: '2' };
    const reqObj3 = { type: 'c', id: '3' };

    test(`throws an error if the base client operation fails`, async () => {
      clientOpts.baseClient.collectMultiNamespaceReferences.mockRejectedValue(new Error('Oh no!'));
      await expect(() =>
        client.collectMultiNamespaceReferences([reqObj1], { namespace: spaceX })
      ).rejects.toThrowError('Oh no!');
      expect(clientOpts.baseClient.collectMultiNamespaceReferences).toHaveBeenCalledTimes(1);
      expect(mockEnsureAuthorized).not.toHaveBeenCalled();
      expect(clientOpts.auditLogger.log).not.toHaveBeenCalled();
    });

    describe(`throws decorated ForbiddenError and adds audit events when unauthorized`, () => {
      test(`with purpose 'collectMultiNamespaceReferences'`, async () => {
        // Use the default mocked results for the base client call.
        // This fails because the user is not authorized to bulk_get type 'c' in the current space.
        mockEnsureAuthorized.mockResolvedValue({
          status: 'partially_authorized',
          typeActionMap: new Map()
            .set('a', { bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] } })
            .set('b', { bulk_get: { authorizedSpaces: [spaceX, spaceY] } })
            .set('c', { bulk_get: { authorizedSpaces: [spaceY] } }),
        });
        const options = { namespace: spaceX }; // spaceX is the current space
        await expect(() =>
          client.collectMultiNamespaceReferences([reqObj1, reqObj2, reqObj3], options)
        ).rejects.toThrowError(clientOpts.forbiddenError);
        expect(clientOpts.baseClient.collectMultiNamespaceReferences).toHaveBeenCalledTimes(1);
        expect(mockEnsureAuthorized).toHaveBeenCalledTimes(1);
        expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(3);
        expectAuditEvent(AUDIT_ACTION, 'failure', reqObj1);
        expectAuditEvent(AUDIT_ACTION, 'failure', reqObj2);
        expectAuditEvent(AUDIT_ACTION, 'failure', reqObj3);
      });

      test(`with purpose 'updateObjectsSpaces'`, async () => {
        // Use the default mocked results for the base client call.
        // This fails because the user is not authorized to share_to_space type 'c' in the current space.
        mockEnsureAuthorized.mockResolvedValue({
          status: 'partially_authorized',
          typeActionMap: new Map()
            .set('a', {
              bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
              share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
            })
            .set('b', {
              bulk_get: { authorizedSpaces: [spaceX, spaceY] },
              share_to_space: { authorizedSpaces: [spaceX, spaceY] },
            })
            .set('c', {
              bulk_get: { authorizedSpaces: [spaceX, spaceY] },
              share_to_space: { authorizedSpaces: [spaceY] },
            }),
        });
        const options = { namespace: spaceX, purpose: 'updateObjectsSpaces' as const }; // spaceX is the current space
        await expect(() =>
          client.collectMultiNamespaceReferences([reqObj1, reqObj2, reqObj3], options)
        ).rejects.toThrowError(clientOpts.forbiddenError);
        expect(clientOpts.baseClient.collectMultiNamespaceReferences).toHaveBeenCalledTimes(1);
        expect(mockEnsureAuthorized).toHaveBeenCalledTimes(1);
        expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(3);
        expectAuditEvent(AUDIT_ACTION, 'failure', reqObj1);
        expectAuditEvent(AUDIT_ACTION, 'failure', reqObj2);
        expectAuditEvent(AUDIT_ACTION, 'failure', reqObj3);
      });
    });

    test(`throws an error if the base client result includes a requested object without a valid inbound reference`, async () => {
      // We *shouldn't* ever get an inbound reference that is not also present in the base client response objects array.
      const spaces = [spaceX];

      const obj1 = { ...reqObj1, spaces, inboundReferences: [] };
      const obj2 = {
        type: 'a',
        id: '2',
        spaces,
        ...getInboundRefsFrom({ type: 'some-type', id: 'some-id' }),
      };
      clientOpts.baseClient.collectMultiNamespaceReferences.mockResolvedValueOnce({
        objects: [obj1, obj2],
      });
      mockEnsureAuthorized.mockResolvedValue({
        status: 'partially_authorized',
        typeActionMap: new Map().set('a', {
          bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
        }),
      });
      // When the loop gets to obj2, it will determine that the user is authorized for the object but *not* for the graph. However, it will
      // also determine that there is *no* valid inbound reference tying this object back to what was requested. In this case, throw an
      // error.

      const options = { namespace: spaceX }; // spaceX is the current space
      await expect(() =>
        client.collectMultiNamespaceReferences([reqObj1], options)
      ).rejects.toThrowError('Unexpected inbound reference to "some-type:some-id"');
    });
  });

  describe(`checks privileges`, () => {
    // Other test cases below contain more complex assertions for privilege checks, but these focus on the current space (default vs non-default)
    const reqObj1 = { type: 'a', id: '1' };
    const obj1 = { ...reqObj1, spaces: ['*'], inboundReferences: [] };

    beforeEach(() => {
      clientOpts.baseClient.collectMultiNamespaceReferences.mockResolvedValueOnce({
        objects: [obj1],
      });
      mockEnsureAuthorized.mockResolvedValue({
        status: 'fully_authorized',
        typeActionMap: new Map().set('a', {
          bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] }, // success case for the simplest test
        }),
      });
    });

    test(`in the default space`, async () => {
      await client.collectMultiNamespaceReferences([reqObj1]);
      expect(mockEnsureAuthorized).toHaveBeenCalledTimes(1);
      expect(mockEnsureAuthorized).toHaveBeenCalledWith(
        expect.any(Object), // dependencies
        ['a'], // unique types of the fetched objects
        ['bulk_get'], // actions
        ['default'], // unique spaces that the fetched objects exist in, along with the current space
        { requireFullAuthorization: false }
      );
    });

    test(`in a non-default space`, async () => {
      await client.collectMultiNamespaceReferences([reqObj1], { namespace: spaceX });
      expect(mockEnsureAuthorized).toHaveBeenCalledTimes(1);
      expect(mockEnsureAuthorized).toHaveBeenCalledWith(
        expect.any(Object), // dependencies
        ['a'], // unique types of the fetched objects
        ['bulk_get'], // actions
        [spaceX], // unique spaces that the fetched objects exist in, along with the current space
        { requireFullAuthorization: false }
      );
    });
  });

  describe(`checks privileges, filters/redacts objects correctly, and records audit events`, () => {
    const reqObj1 = { type: 'a', id: '1' };
    const reqObj2 = { type: 'b', id: '2' };
    const spaces = [spaceX, spaceY, spaceZ];

    // Actual object graph:
    //   ─► obj1 (a:1) ─┬─► obj3 (c:3) ───► obj5 (c:5) ─► obj8 (c:8) ─┐
    //                  │                       ▲                     │
    //                  │                       │                     │
    //                  └─► obj4 (d:4) ─┬─► obj6 (c:6) ◄──────────────┘
    //   ─► obj2 (b:2)                  └─► obj7 (c:7)
    //
    // Object graph that the consumer sees after authorization:
    //   ─► obj1 (a:1) ─┬─► obj3 (c:3) ───► obj5 (c:5) ─► obj8 (c:8) ─► obj6 (c:6) ─┐
    //                  │                       ▲                                   │
    //                  │                       └───────────────────────────────────┘
    //                  └─► obj4 (d:4)
    //   ─► obj2 (b:2)
    const obj1 = { ...reqObj1, spaces, inboundReferences: [] };
    const obj2 = { ...reqObj2, spaces: [], inboundReferences: [] }; // non-multi-namespace types and hidden types will be returned with an empty spaces array
    const obj3 = { type: 'c', id: '3', spaces, ...getInboundRefsFrom(obj1) };
    const obj4 = { type: 'd', id: '4', spaces, ...getInboundRefsFrom(obj1) };
    const obj5 = {
      type: 'c',
      id: '5',
      spaces: ['*'],
      ...getInboundRefsFrom(obj3, { type: 'c', id: '6' }),
    };
    const obj6 = {
      type: 'c',
      id: '6',
      spaces,
      ...getInboundRefsFrom(obj4, { type: 'c', id: '8' }),
    };
    const obj7 = { type: 'c', id: '7', spaces, ...getInboundRefsFrom(obj4) };
    const obj8 = { type: 'c', id: '8', spaces, ...getInboundRefsFrom(obj5) };

    beforeEach(() => {
      clientOpts.baseClient.collectMultiNamespaceReferences.mockResolvedValueOnce({
        objects: [obj1, obj2, obj3, obj4, obj5, obj6, obj7, obj8],
      });
    });

    test(`with purpose 'collectMultiNamespaceReferences'`, async () => {
      mockEnsureAuthorized.mockResolvedValue({
        status: 'partially_authorized',
        typeActionMap: new Map()
          .set('a', { bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] } })
          .set('b', { bulk_get: { authorizedSpaces: [spaceX] } })
          .set('c', { bulk_get: { authorizedSpaces: [spaceX] } }),
        // the user is not authorized to read type 'd'
      });

      const options = { namespace: spaceX }; // spaceX is the current space
      const result = await client.collectMultiNamespaceReferences([reqObj1, reqObj2], options);
      expect(result).toEqual({
        objects: [
          obj1, // obj1's spaces array is not redacted because the user is globally authorized to access it
          obj2, // obj2 has an empty spaces array (see above)
          { ...obj3, spaces: [spaceX, '?', '?'] },
          { ...obj4, spaces: [], isMissing: true }, // obj4 is marked as Missing because the user was not authorized to access it
          obj5, // obj5's spaces array is not redacted, because it exists in All Spaces
          // obj7 is not included at all because the user was not authorized to access its inbound reference (obj4)
          { ...obj8, spaces: [spaceX, '?', '?'] },
          { ...obj6, spaces: [spaceX, '?', '?'], ...getInboundRefsFrom(obj8) }, // obj6 is at the back of the list and its inboundReferences array is redacted because the user is not authorized to access one of its inbound references, obj4
        ],
      });
      expect(clientOpts.baseClient.collectMultiNamespaceReferences).toHaveBeenCalledTimes(1);
      expect(clientOpts.baseClient.collectMultiNamespaceReferences).toHaveBeenCalledWith(
        [reqObj1, reqObj2],
        options
      );
      expect(mockEnsureAuthorized).toHaveBeenCalledTimes(1);
      expect(mockEnsureAuthorized).toHaveBeenCalledWith(
        expect.any(Object), // dependencies
        ['a', 'b', 'c', 'd'], // unique types of the fetched objects
        ['bulk_get'], // actions
        [spaceX, spaceY, spaceZ], // unique spaces that the fetched objects exist in, along with the current space
        { requireFullAuthorization: false }
      );
      expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(5);
      expectAuditEvent(AUDIT_ACTION, 'success', obj1);
      expectAuditEvent(AUDIT_ACTION, 'success', obj3);
      expectAuditEvent(AUDIT_ACTION, 'success', obj5);
      expectAuditEvent(AUDIT_ACTION, 'success', obj8);
      expectAuditEvent(AUDIT_ACTION, 'success', obj6);
      // obj2, obj4, and obj7 are intentionally excluded from the audit record because we did not return any information about them to the user
    });

    test(`with purpose 'updateObjectsSpaces'`, async () => {
      mockEnsureAuthorized.mockResolvedValue({
        status: 'partially_authorized',
        typeActionMap: new Map()
          .set('a', {
            share_to_space: { authorizedSpaces: [spaceX] },
            bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
            // Even though the user can only share type 'a' in spaceX, we won't redact spaceY or spaceZ because the user has global read privileges
          })
          .set('b', {
            share_to_space: { authorizedSpaces: [spaceX] },
            bulk_get: { authorizedSpaces: [spaceX, spaceY] },
          })
          .set('c', {
            share_to_space: { authorizedSpaces: [spaceX] },
            bulk_get: { authorizedSpaces: [spaceX, spaceY] },
            // Even though the user can only share type 'c' in spaceX, we won't redact spaceY because the user has read privileges there
          }),
        // the user is not authorized to read or share type 'd'
      });

      const options = { namespace: spaceX, purpose: 'updateObjectsSpaces' as const }; // spaceX is the current space
      const result = await client.collectMultiNamespaceReferences([reqObj1, reqObj2], options);
      expect(result).toEqual({
        objects: [
          obj1, // obj1's spaces array is not redacted because the user is globally authorized to access it
          obj2, // obj2 has an empty spaces array (see above)
          { ...obj3, spaces: [spaceX, spaceY, '?'] },
          { ...obj4, spaces: [], isMissing: true }, // obj4 is marked as Missing because the user was not authorized to access it
          obj5, // obj5's spaces array is not redacted, because it exists in All Spaces
          // obj7 is not included at all because the user was not authorized to access its inbound reference (obj4)
          { ...obj8, spaces: [spaceX, spaceY, '?'] },
          { ...obj6, spaces: [spaceX, spaceY, '?'], ...getInboundRefsFrom(obj8) }, // obj6 is at the back of the list and its inboundReferences array is redacted because the user is not authorized to access one of its inbound references, obj4
        ],
      });
      expect(clientOpts.baseClient.collectMultiNamespaceReferences).toHaveBeenCalledTimes(1);
      expect(clientOpts.baseClient.collectMultiNamespaceReferences).toHaveBeenCalledWith(
        [reqObj1, reqObj2],
        options
      );
      expect(mockEnsureAuthorized).toHaveBeenCalledTimes(1);
      expect(mockEnsureAuthorized).toHaveBeenCalledWith(
        expect.any(Object), // dependencies
        ['a', 'b', 'c', 'd'], // unique types of the fetched objects
        ['bulk_get', 'share_to_space'], // actions
        [spaceX, spaceY, spaceZ], // unique spaces that the fetched objects exist in, along with the current space
        { requireFullAuthorization: false }
      );
      expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(5);
      expectAuditEvent(AUDIT_ACTION, 'success', obj1);
      expectAuditEvent(AUDIT_ACTION, 'success', obj3);
      expectAuditEvent(AUDIT_ACTION, 'success', obj5);
      expectAuditEvent(AUDIT_ACTION, 'success', obj8);
      expectAuditEvent(AUDIT_ACTION, 'success', obj6);
      // obj2, obj4, and obj7 are intentionally excluded from the audit record because we did not return any information about them to the user
    });
  });
});

describe('#updateObjectsSpaces', () => {
  const AUDIT_ACTION = 'saved_object_update_objects_spaces';
  const spaceA = 'space-a';
  const spaceB = 'space-b';
  const spaceC = 'space-c';
  const spaceD = 'space-d';
  const obj1 = { type: 'x', id: '1' };
  const obj2 = { type: 'y', id: '2' };
  const obj3 = { type: 'z', id: '3' };
  const obj4 = { type: 'z', id: '4' };
  const obj5 = { type: 'z', id: '5' };

  describe('errors', () => {
    test(`throws an error if the base client bulkGet operation fails`, async () => {
      clientOpts.baseClient.bulkGet.mockRejectedValue(new Error('Oh no!'));
      await expect(() =>
        client.updateObjectsSpaces([obj1], [spaceA], [spaceB], { namespace: spaceC })
      ).rejects.toThrowError('Oh no!');
      expect(clientOpts.baseClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(mockEnsureAuthorized).not.toHaveBeenCalled();
      expect(clientOpts.auditLogger.log).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError and adds audit events when unauthorized`, async () => {
      clientOpts.baseClient.bulkGet.mockResolvedValue({
        saved_objects: [
          { ...obj1, namespaces: [spaceB, spaceC, spaceD] },
          { ...obj2, namespaces: [spaceB, spaceC, spaceD] },
          { ...obj3, namespaces: [spaceB, spaceC, spaceD] },
        ] as SavedObject[],
      });
      // This fails because the user is not authorized to share_to_space type 'z' in the current space.
      mockEnsureAuthorized.mockResolvedValue({
        status: 'partially_authorized',
        typeActionMap: new Map()
          .set('x', {
            bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
            share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set('y', {
            bulk_get: { authorizedSpaces: [spaceA, spaceB, spaceC, spaceD] },
            share_to_space: { authorizedSpaces: [spaceA, spaceB, spaceC, spaceD] },
          })
          .set('z', {
            bulk_get: { authorizedSpaces: [spaceA, spaceB, spaceC] },
            share_to_space: { authorizedSpaces: [spaceA, spaceB] },
          }),
      });

      const objects = [obj1, obj2, obj3];
      const spacesToAdd = [spaceA];
      const spacesToRemove = [spaceB];
      const options = { namespace: spaceC }; // spaceC is the current space
      await expect(() =>
        client.updateObjectsSpaces(objects, spacesToAdd, spacesToRemove, options)
      ).rejects.toThrowError(clientOpts.forbiddenError);
      expect(clientOpts.baseClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(mockEnsureAuthorized).toHaveBeenCalledTimes(1);
      expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(3);
      expectAuditEvent(AUDIT_ACTION, 'failure', obj1);
      expectAuditEvent(AUDIT_ACTION, 'failure', obj2);
      expectAuditEvent(AUDIT_ACTION, 'failure', obj3);
      expect(clientOpts.baseClient.updateObjectsSpaces).not.toHaveBeenCalled();
    });

    test(`throws an error if the base client updateObjectsSpaces operation fails`, async () => {
      clientOpts.baseClient.bulkGet.mockResolvedValue({
        saved_objects: [
          { ...obj1, namespaces: [spaceB, spaceC, spaceD] },
          { ...obj2, namespaces: [spaceB, spaceC, spaceD] },
          { ...obj3, namespaces: [spaceB, spaceC, spaceD] },
        ] as SavedObject[],
      });
      mockEnsureAuthorized.mockResolvedValue({
        status: 'partially_authorized',
        typeActionMap: new Map()
          .set('x', {
            bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
            share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
          })
          .set('y', {
            bulk_get: { authorizedSpaces: [spaceA, spaceB, spaceC, spaceD] },
            share_to_space: { authorizedSpaces: [spaceA, spaceB, spaceC] },
          })
          .set('z', {
            bulk_get: { authorizedSpaces: [spaceA, spaceB, spaceC] },
            share_to_space: { authorizedSpaces: [spaceA, spaceB, spaceC] },
          }),
      });
      clientOpts.baseClient.updateObjectsSpaces.mockRejectedValue(new Error('Oh no!'));

      const objects = [obj1, obj2, obj3];
      const spacesToAdd = [spaceA];
      const spacesToRemove = [spaceB];
      const options = { namespace: spaceC }; // spaceC is the current space
      await expect(() =>
        client.updateObjectsSpaces(objects, spacesToAdd, spacesToRemove, options)
      ).rejects.toThrowError('Oh no!');
      expect(clientOpts.baseClient.bulkGet).toHaveBeenCalledTimes(1);
      expect(mockEnsureAuthorized).toHaveBeenCalledTimes(1);
      expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(3);
      expectAuditEvent(AUDIT_ACTION, 'unknown', obj1);
      expectAuditEvent(AUDIT_ACTION, 'unknown', obj2);
      expectAuditEvent(AUDIT_ACTION, 'unknown', obj3);
      expect(clientOpts.baseClient.updateObjectsSpaces).toHaveBeenCalledTimes(1);
    });
  });

  test(`checks privileges, filters/redacts objects correctly, and records audit events`, async () => {
    const bulkGetResults = [
      { ...obj1, namespaces: [spaceB, spaceC, spaceD], version: 'v1' },
      { ...obj2, namespaces: [spaceB, spaceC, spaceD], version: 'v2' },
      { ...obj3, namespaces: [spaceB, spaceC, spaceD], version: 'v3' },
      { ...obj4, namespaces: ['*'], version: 'v4' }, // obj4 exists in all spaces
      { ...obj5, namespaces: [spaceB, spaceC, spaceD], version: 'v5' },
    ] as SavedObject[];
    clientOpts.baseClient.bulkGet.mockResolvedValue({ saved_objects: bulkGetResults });
    mockEnsureAuthorized.mockResolvedValue({
      status: 'partially_authorized',
      typeActionMap: new Map()
        .set('x', {
          bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
          share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
        })
        .set('y', {
          bulk_get: { authorizedSpaces: [spaceA, spaceB, spaceC, spaceD] },
          share_to_space: { authorizedSpaces: [spaceA, spaceB, spaceC] },
        })
        .set('z', {
          bulk_get: { authorizedSpaces: [spaceA, spaceB, spaceC] }, // the user is not authorized to bulkGet type 'z' in spaceD, so it will be redacted from the results
          share_to_space: { authorizedSpaces: [spaceA, spaceB, spaceC] },
        }),
    });
    clientOpts.baseClient.updateObjectsSpaces.mockResolvedValue({
      objects: [
        // Each object was added to spaceA and removed from spaceB
        { ...obj1, spaces: [spaceA, spaceC, spaceD] },
        { ...obj2, spaces: [spaceA, spaceC, spaceD] },
        { ...obj3, spaces: [spaceA, spaceC, spaceD] },
        { ...obj4, spaces: ['*', spaceA] }, // even though this object exists in all spaces, we won't pass '*' to ensureAuthorized
        { ...obj5, spaces: [], error: new Error('Oh no!') }, // we encountered an error when attempting to update obj5
      ] as SavedObjectsUpdateObjectsSpacesResponseObject[],
    });

    const objects = [obj1, obj2, obj3, obj4, obj5];
    const spacesToAdd = [spaceA];
    const spacesToRemove = [spaceB];
    const options = { namespace: spaceC }; // spaceC is the current space
    const result = await client.updateObjectsSpaces(objects, spacesToAdd, spacesToRemove, options);
    expect(result).toEqual({
      objects: [
        { ...obj1, spaces: [spaceA, spaceC, spaceD] }, // obj1's spaces array is not redacted because the user is globally authorized to access it
        { ...obj2, spaces: [spaceA, spaceC, spaceD] }, // obj2's spaces array is not redacted because the user is authorized to access it in each space
        { ...obj3, spaces: [spaceA, spaceC, '?'] }, // obj3's spaces array is redacted because the user is not authorized to access it in spaceD
        { ...obj4, spaces: ['*', spaceA] },
        { ...obj5, spaces: [], error: new Error('Oh no!') },
      ],
    });

    expect(clientOpts.baseClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(mockEnsureAuthorized).toHaveBeenCalledTimes(1);
    expect(mockEnsureAuthorized).toHaveBeenCalledWith(
      expect.any(Object), // dependencies
      ['x', 'y', 'z'], // unique types of the fetched objects
      ['bulk_get', 'share_to_space'], // actions
      [spaceC, spaceA, spaceB, spaceD], // unique spaces of: the current space, spacesToAdd, spacesToRemove, and spaces that the fetched objects exist in (excludes '*')
      { requireFullAuthorization: false }
    );
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(5);
    expectAuditEvent(AUDIT_ACTION, 'unknown', obj1);
    expectAuditEvent(AUDIT_ACTION, 'unknown', obj2);
    expectAuditEvent(AUDIT_ACTION, 'unknown', obj3);
    expectAuditEvent(AUDIT_ACTION, 'unknown', obj4);
    expectAuditEvent(AUDIT_ACTION, 'unknown', obj5);
    expect(clientOpts.baseClient.updateObjectsSpaces).toHaveBeenCalledTimes(1);
    expect(clientOpts.baseClient.updateObjectsSpaces).toHaveBeenCalledWith(
      bulkGetResults.map(({ namespaces: spaces, ...otherAttrs }) => ({ spaces, ...otherAttrs })),
      spacesToAdd,
      spacesToRemove,
      options
    );
  });

  test(`checks privileges for the global resource when spacesToAdd includes '*'`, async () => {
    const bulkGetResults = [{ ...obj1, namespaces: [spaceA], version: 'v1' }] as SavedObject[];
    clientOpts.baseClient.bulkGet.mockResolvedValue({ saved_objects: bulkGetResults });
    mockEnsureAuthorized.mockResolvedValue({
      status: 'fully_authorized',
      typeActionMap: new Map().set('x', {
        bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
        share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
      }),
    });
    clientOpts.baseClient.updateObjectsSpaces.mockResolvedValue({
      objects: [
        // The object was removed from spaceA and added to '*'
        { ...obj1, spaces: ['*'] },
      ] as SavedObjectsUpdateObjectsSpacesResponseObject[],
    });

    const objects = [obj1];
    const spacesToAdd = ['*'];
    const spacesToRemove = [spaceA];
    const options = { namespace: spaceC }; // spaceC is the current space
    await client.updateObjectsSpaces(objects, spacesToAdd, spacesToRemove, options);

    expect(mockEnsureAuthorized).toHaveBeenCalledTimes(1);
    expect(mockEnsureAuthorized).toHaveBeenCalledWith(
      expect.any(Object), // dependencies
      ['x'], // unique types of the fetched objects
      ['bulk_get', 'share_to_space'], // actions
      [spaceC, '*', spaceA], // unique spaces of: the current space, spacesToAdd, spacesToRemove, and spaces that the fetched objects exist in (excludes '*')
      { requireFullAuthorization: false }
    );
  });

  test(`checks privileges for the global resource when spacesToRemove includes '*'`, async () => {
    const bulkGetResults = [{ ...obj1, namespaces: ['*'], version: 'v1' }] as SavedObject[];
    clientOpts.baseClient.bulkGet.mockResolvedValue({ saved_objects: bulkGetResults });
    mockEnsureAuthorized.mockResolvedValue({
      status: 'fully_authorized',
      typeActionMap: new Map().set('x', {
        bulk_get: { isGloballyAuthorized: true, authorizedSpaces: [] },
        share_to_space: { isGloballyAuthorized: true, authorizedSpaces: [] },
      }),
    });
    clientOpts.baseClient.updateObjectsSpaces.mockResolvedValue({
      objects: [
        // The object was removed from spaceA and added to '*'
        { ...obj1, spaces: ['*'] },
      ] as SavedObjectsUpdateObjectsSpacesResponseObject[],
    });

    const objects = [obj1];
    const spacesToAdd = [spaceA];
    const spacesToRemove = ['*'];
    const options = { namespace: spaceC }; // spaceC is the current space
    await client.updateObjectsSpaces(objects, spacesToAdd, spacesToRemove, options);

    expect(mockEnsureAuthorized).toHaveBeenCalledTimes(1);
    expect(mockEnsureAuthorized).toHaveBeenCalledWith(
      expect.any(Object), // dependencies
      ['x'], // unique types of the fetched objects
      ['bulk_get', 'share_to_space'], // actions
      [spaceC, spaceA, '*'], // unique spaces of: the current space, spacesToAdd, spacesToRemove, and spaces that the fetched objects exist in (excludes '*')
      { requireFullAuthorization: false }
    );
  });
});

describe('other', () => {
  test(`assigns errors from constructor to .errors`, () => {
    expect(client.errors).toBe(clientOpts.errors);
  });

  test(`namespace redaction fails safe`, async () => {
    const type = 'foo';
    const id = `${type}-id`;
    const namespace = 'some-ns';
    const namespaces = ['some-other-namespace', '*', namespace];
    const returnValue = { namespaces, foo: 'bar' };
    clientOpts.baseClient.get.mockReturnValue(returnValue as any);

    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementationOnce(
      getMockCheckPrivilegesSuccess // privilege check for authorization
    );
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
      // privilege check for namespace filtering
      (_actions: string | string[], _namespaces?: string | string[]) => ({
        hasAllRequested: false,
        username: USERNAME,
        privileges: {
          kibana: [
            // this is a contrived scenario as we *shouldn't* get both an unauthorized and authorized result for a given resource...
            // however, in case we do, we should fail-safe (authorized + unauthorized = unauthorized)
            { resource: 'some-other-namespace', privilege: 'login:', authorized: false },
            { resource: 'some-other-namespace', privilege: 'login:', authorized: true },
          ],
        },
      })
    );

    const result = await client.get(type, id, { namespace });
    // we will never redact the "All Spaces" ID
    expect(result).toEqual(expect.objectContaining({ namespaces: ['*', namespace, '?'] }));

    expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledTimes(2);
    expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenLastCalledWith('login:', [
      'some-other-namespace',
    ]);
  });
});
