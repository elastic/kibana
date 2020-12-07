/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecureSavedObjectsClientWrapper } from './secure_saved_objects_client_wrapper';
import { Actions } from '../authorization';
import { securityAuditLoggerMock, auditServiceMock } from '../audit/index.mock';
import { savedObjectsClientMock, httpServerMock } from '../../../../../src/core/server/mocks';
import { SavedObjectsClientContract } from 'kibana/server';
import { SavedObjectActions } from '../authorization/actions/saved_object';
import { AuditEvent, EventOutcome } from '../audit';

jest.mock('../../../../../src/core/server/saved_objects/service/lib/utils', () => {
  const { SavedObjectsUtils } = jest.requireActual(
    '../../../../../src/core/server/saved_objects/service/lib/utils'
  );
  return {
    SavedObjectsUtils: {
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

  const errors = ({
    decorateForbiddenError: jest.fn().mockReturnValue(forbiddenError),
    decorateGeneralError: jest.fn().mockReturnValue(generalError),
    createBadRequestError: jest.fn().mockImplementation((message) => new Error(message)),
    isNotFoundError: jest.fn().mockReturnValue(false),
  } as unknown) as jest.Mocked<SavedObjectsClientContract['errors']>;
  const getSpacesService = jest.fn().mockReturnValue({
    namespaceToSpaceId: (namespace?: string) => (namespace ? namespace : 'default'),
  });

  return {
    actions,
    baseClient: savedObjectsClientMock.create(),
    checkSavedObjectsPrivilegesAsCurrentUser: jest.fn(),
    errors,
    getSpacesService,
    legacyAuditLogger: securityAuditLoggerMock.create(),
    auditLogger: auditServiceMock.create().asScoped(httpServerMock.createKibanaRequest()),
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
  expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
  expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
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
  const getCalls = (clientOpts.actions.savedObject.get as jest.MockedFunction<
    SavedObjectActions['get']
  >).mock.calls;
  const actions = clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mock.calls[0][0];
  const spaceId = args.options?.namespaces
    ? args.options?.namespaces[0]
    : args.options?.namespace || 'default';

  const ACTION = getCalls[0][1];
  const types = getCalls.map((x) => x[0]);
  const missing = [{ spaceId, privilege: actions[0] }]; // if there was more than one type, only the first type was unauthorized
  const spaceIds = [spaceId];

  expect(clientOpts.errors.decorateForbiddenError).toHaveBeenCalledTimes(1);
  expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledTimes(1);
  expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
    USERNAME,
    action ?? ACTION,
    types,
    spaceIds,
    missing,
    args
  );
  expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
};

const expectSuccess = async (fn: Function, args: Record<string, any>, action?: string) => {
  const result = await fn.bind(client)(...Object.values(args));
  const getCalls = (clientOpts.actions.savedObject.get as jest.MockedFunction<
    SavedObjectActions['get']
  >).mock.calls;
  const ACTION = getCalls[0][1];
  const types = getCalls.map((x) => x[0]);
  const spaceIds = args.options?.namespaces || [args.options?.namespace || 'default'];

  expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
  expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledTimes(1);
  expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
    USERNAME,
    action ?? ACTION,
    types,
    spaceIds,
    args
  );
  return result;
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
  const getResults = (clientOpts.actions.savedObject.get as jest.MockedFunction<
    SavedObjectActions['get']
  >).mock.results;
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
  clientOpts.baseClient.update.mockReturnValue(returnValue as any);
  clientOpts.baseClient.addToNamespaces.mockReturnValue(returnValue as any);
  clientOpts.baseClient.deleteFromNamespaces.mockReturnValue(returnValue as any);

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
  action: AuditEvent['event']['action'],
  outcome: AuditEvent['event']['outcome'],
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
            saved_object: savedObject,
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

  // succeed privilege checks by default
  clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
    getMockCheckPrivilegesSuccess
  );
});

describe('#addToNamespaces', () => {
  const type = 'foo';
  const id = `${type}-id`;
  const newNs1 = 'foo-namespace';
  const newNs2 = 'bar-namespace';
  const namespaces = [newNs1, newNs2];
  const currentNs = 'default';
  const privilege = `mock-saved_object:${type}/share_to_space`;

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    await expectGeneralError(client.addToNamespaces, { type, id, namespaces });
  });

  test(`throws decorated ForbiddenError when unauthorized to create in new space`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
      getMockCheckPrivilegesFailure
    );

    await expect(client.addToNamespaces(type, id, namespaces)).rejects.toThrowError(
      clientOpts.forbiddenError
    );

    expect(clientOpts.errors.decorateForbiddenError).toHaveBeenCalledTimes(1);
    expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledTimes(1);
    expect(
      clientOpts.legacyAuditLogger.savedObjectsAuthorizationFailure
    ).toHaveBeenCalledWith(
      USERNAME,
      'addToNamespacesCreate',
      [type],
      namespaces.sort(),
      [{ privilege, spaceId: newNs1 }],
      { id, type, namespaces, options: {} }
    );
    expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`throws decorated ForbiddenError when unauthorized to update in current space`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementationOnce(
      getMockCheckPrivilegesSuccess // create
    );
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
      getMockCheckPrivilegesFailure // update
    );

    await expect(client.addToNamespaces(type, id, namespaces)).rejects.toThrowError(
      clientOpts.forbiddenError
    );

    expect(clientOpts.errors.decorateForbiddenError).toHaveBeenCalledTimes(1);
    expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledTimes(1);
    expect(
      clientOpts.legacyAuditLogger.savedObjectsAuthorizationFailure
    ).toHaveBeenLastCalledWith(
      USERNAME,
      'addToNamespacesUpdate',
      [type],
      [currentNs],
      [{ privilege, spaceId: currentNs }],
      { id, type, namespaces, options: {} }
    );
    expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledTimes(1);
  });

  test(`returns result of baseClient.addToNamespaces when authorized`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.addToNamespaces.mockReturnValue(apiCallReturnValue as any);

    const result = await client.addToNamespaces(type, id, namespaces);
    expect(result).toBe(apiCallReturnValue);

    expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledTimes(2);
    expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenNthCalledWith(
      1,
      USERNAME,
      'addToNamespacesCreate', // action for privilege check is 'share_to_space', but auditAction is 'addToNamespacesCreate'
      [type],
      namespaces.sort(),
      { type, id, namespaces, options: {} }
    );
    expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenNthCalledWith(
      2,
      USERNAME,
      'addToNamespacesUpdate', // action for privilege check is 'share_to_space', but auditAction is 'addToNamespacesUpdate'
      [type],
      [currentNs],
      { type, id, namespaces, options: {} }
    );
  });

  test(`checks privileges for user, actions, and namespaces`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementationOnce(
      getMockCheckPrivilegesSuccess // create
    );
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
      getMockCheckPrivilegesFailure // update
    );

    await expect(client.addToNamespaces(type, id, namespaces)).rejects.toThrow(); // test is simpler with error case

    expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledTimes(2);
    expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenNthCalledWith(
      1,
      [privilege],
      namespaces
    );
    expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenNthCalledWith(
      2,
      [privilege],
      undefined // default namespace
    );
  });

  test(`filters namespaces that the user doesn't have access to`, async () => {
    // this operation is unique because it requires two privilege checks before it executes
    await expectObjectNamespaceFiltering(client.addToNamespaces, { type, id, namespaces }, 2);
  });

  test(`adds audit event when successful`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.addToNamespaces.mockReturnValue(apiCallReturnValue as any);
    await client.addToNamespaces(type, id, namespaces);

    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_add_to_spaces', EventOutcome.UNKNOWN, { type, id });
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.addToNamespaces(type, id, namespaces)).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_add_to_spaces', EventOutcome.FAILURE, { type, id });
  });
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
    expectAuditEvent('saved_object_create', EventOutcome.UNKNOWN, { type: obj1.type, id: obj1.id });
    expectAuditEvent('saved_object_create', EventOutcome.UNKNOWN, { type: obj2.type, id: obj2.id });
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.bulkCreate([obj1, obj2], { namespace })).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(2);
    expectAuditEvent('saved_object_create', EventOutcome.FAILURE, { type: obj1.type, id: obj1.id });
    expectAuditEvent('saved_object_create', EventOutcome.FAILURE, { type: obj2.type, id: obj2.id });
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

  test(`checks privileges for user, actions, and namespace`, async () => {
    const objects = [obj1, obj2];
    const options = { namespace };
    await expectPrivilegeCheck(client.bulkGet, { objects, options }, namespace);
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
    expectAuditEvent('saved_object_get', EventOutcome.SUCCESS, obj1);
    expectAuditEvent('saved_object_get', EventOutcome.SUCCESS, obj2);
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.bulkGet([obj1, obj2], { namespace })).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(2);
    expectAuditEvent('saved_object_get', EventOutcome.FAILURE, obj1);
    expectAuditEvent('saved_object_get', EventOutcome.FAILURE, obj2);
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
    expectAuditEvent('saved_object_update', EventOutcome.UNKNOWN, { type: obj1.type, id: obj1.id });
    expectAuditEvent('saved_object_update', EventOutcome.UNKNOWN, { type: obj2.type, id: obj2.id });
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.bulkUpdate<any>([obj1, obj2], { namespace })).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(2);
    expectAuditEvent('saved_object_update', EventOutcome.FAILURE, { type: obj1.type, id: obj1.id });
    expectAuditEvent('saved_object_update', EventOutcome.FAILURE, { type: obj2.type, id: obj2.id });
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
    expectAuditEvent('saved_object_create', EventOutcome.UNKNOWN, { type, id: expect.any(String) });
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.create(type, attributes, { namespace })).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_create', EventOutcome.FAILURE, { type, id: expect.any(String) });
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
    expectAuditEvent('saved_object_delete', EventOutcome.UNKNOWN, { type, id });
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.delete(type, id)).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_delete', EventOutcome.FAILURE, { type, id });
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
    expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledTimes(1);
    expect(
      clientOpts.legacyAuditLogger.savedObjectsAuthorizationFailure
    ).toHaveBeenCalledWith(
      USERNAME,
      'find',
      [type1],
      options.namespaces,
      [{ spaceId: 'some-ns', privilege: 'mock-saved_object:foo/find' }],
      { options }
    );
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
    expectAuditEvent('saved_object_find', EventOutcome.SUCCESS, obj1);
    expectAuditEvent('saved_object_find', EventOutcome.SUCCESS, obj2);
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
      getMockCheckPrivilegesFailure
    );
    await client.find({ type: type1 });
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_find', EventOutcome.FAILURE);
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
    expectAuditEvent('saved_object_get', EventOutcome.SUCCESS, { type, id });
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.get(type, id, { namespace })).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_get', EventOutcome.FAILURE, { type, id });
  });
});

describe('#deleteFromNamespaces', () => {
  const type = 'foo';
  const id = `${type}-id`;
  const namespace1 = 'default';
  const namespace2 = 'another-namespace';
  const namespaces = [namespace1, namespace2];
  const privilege = `mock-saved_object:${type}/share_to_space`;

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    await expectGeneralError(client.deleteFromNamespaces, { type, id, namespaces });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
      getMockCheckPrivilegesFailure
    );

    await expect(client.deleteFromNamespaces(type, id, namespaces)).rejects.toThrowError(
      clientOpts.forbiddenError
    );

    expect(clientOpts.errors.decorateForbiddenError).toHaveBeenCalledTimes(1);
    expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledTimes(1);
    expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
      USERNAME,
      'deleteFromNamespaces', // action for privilege check is 'share_to_space', but auditAction is 'deleteFromNamespaces'
      [type],
      namespaces.sort(),
      [{ privilege, spaceId: namespace1 }],
      { type, id, namespaces, options: {} }
    );
    expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`returns result of baseClient.deleteFromNamespaces when authorized`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.deleteFromNamespaces.mockReturnValue(apiCallReturnValue as any);

    const result = await client.deleteFromNamespaces(type, id, namespaces);
    expect(result).toBe(apiCallReturnValue);

    expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledTimes(1);
    expect(clientOpts.legacyAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
      USERNAME,
      'deleteFromNamespaces', // action for privilege check is 'share_to_space', but auditAction is 'deleteFromNamespaces'
      [type],
      namespaces.sort(),
      { type, id, namespaces, options: {} }
    );
  });

  test(`checks privileges for user, actions, and namespace`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
      getMockCheckPrivilegesFailure
    );

    await expect(client.deleteFromNamespaces(type, id, namespaces)).rejects.toThrow(); // test is simpler with error case

    expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledTimes(1);
    expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
      [privilege],
      namespaces
    );
  });

  test(`filters namespaces that the user doesn't have access to`, async () => {
    await expectObjectNamespaceFiltering(client.deleteFromNamespaces, { type, id, namespaces });
  });

  test(`adds audit event when successful`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.deleteFromNamespaces.mockReturnValue(apiCallReturnValue as any);
    await client.deleteFromNamespaces(type, id, namespaces);
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_delete_from_spaces', EventOutcome.UNKNOWN, { type, id });
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.deleteFromNamespaces(type, id, namespaces)).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_delete_from_spaces', EventOutcome.FAILURE, { type, id });
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
    expectAuditEvent('saved_object_update', EventOutcome.UNKNOWN, { type, id });
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.update(type, id, attributes, { namespace })).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_update', EventOutcome.FAILURE, { type, id });
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
    expectAuditEvent('saved_object_remove_references', EventOutcome.UNKNOWN, { type, id });
  });

  test(`adds audit event when not successful`, async () => {
    clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(new Error());
    await expect(() => client.removeReferencesTo(type, id)).rejects.toThrow();
    expect(clientOpts.auditLogger.log).toHaveBeenCalledTimes(1);
    expectAuditEvent('saved_object_remove_references', EventOutcome.FAILURE, { type, id });
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
