/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecureSavedObjectsClientWrapper } from './secure_saved_objects_client_wrapper';
import { Actions } from '../authorization';
import { securityAuditLoggerMock } from '../audit/index.mock';
import { savedObjectsClientMock } from '../../../../../src/core/server/mocks';
import { SavedObjectsClientContract } from 'kibana/server';
import { SavedObjectActions } from '../authorization/actions/saved_object';

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
  const getSpacesService = jest.fn().mockReturnValue(true);

  return {
    actions,
    baseClient: savedObjectsClientMock.create(),
    checkSavedObjectsPrivilegesAsCurrentUser: jest.fn(),
    errors,
    getSpacesService,
    auditLogger: securityAuditLoggerMock.create(),
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
  expect(clientOpts.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
  expect(clientOpts.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
};

/**
 * Fails the first authorization check, passes any others
 * Requires that function args are passed in as key/value pairs
 * The argument properties must be in the correct order to be spread properly
 */
const expectForbiddenError = async (fn: Function, args: Record<string, any>) => {
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
  expect(clientOpts.auditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledTimes(1);
  expect(clientOpts.auditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
    USERNAME,
    ACTION,
    types,
    spaceIds,
    missing,
    args
  );
  expect(clientOpts.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
};

const expectSuccess = async (fn: Function, args: Record<string, any>) => {
  const result = await fn.bind(client)(...Object.values(args));
  const getCalls = (clientOpts.actions.savedObject.get as jest.MockedFunction<
    SavedObjectActions['get']
  >).mock.calls;
  const ACTION = getCalls[0][1];
  const types = getCalls.map((x) => x[0]);
  const spaceIds = args.options?.namespaces || [args.options?.namespace || 'default'];

  expect(clientOpts.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
  expect(clientOpts.auditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledTimes(1);
  expect(clientOpts.auditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
    USERNAME,
    ACTION,
    types,
    spaceIds,
    args
  );
  return result;
};

const expectPrivilegeCheck = async (fn: Function, args: Record<string, any>) => {
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
    args.options?.namespace ?? args.options?.namespaces
  );
};

const expectObjectNamespaceFiltering = async (fn: Function, args: Record<string, any>) => {
  clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementationOnce(
    getMockCheckPrivilegesSuccess // privilege check for authorization
  );
  clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
    getMockCheckPrivilegesFailure // privilege check for namespace filtering
  );

  const authorizedNamespace = args.options.namespace || 'default';
  const namespaces = ['some-other-namespace', authorizedNamespace];
  const returnValue = { namespaces, foo: 'bar' };
  // we don't know which base client method will be called; mock them all
  clientOpts.baseClient.create.mockReturnValue(returnValue as any);
  clientOpts.baseClient.get.mockReturnValue(returnValue as any);
  clientOpts.baseClient.update.mockReturnValue(returnValue as any);

  const result = await fn.bind(client)(...Object.values(args));
  expect(result).toEqual(expect.objectContaining({ namespaces: [authorizedNamespace, '?'] }));

  expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledTimes(2);
  expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenLastCalledWith(
    'login:',
    namespaces
  );
};

const expectObjectsNamespaceFiltering = async (fn: Function, args: Record<string, any>) => {
  clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementationOnce(
    getMockCheckPrivilegesSuccess // privilege check for authorization
  );
  clientOpts.checkSavedObjectsPrivilegesAsCurrentUser.mockImplementation(
    getMockCheckPrivilegesFailure // privilege check for namespace filtering
  );

  const authorizedNamespace = args.options.namespace || 'default';
  const returnValue = {
    saved_objects: [
      { namespaces: ['foo'] },
      { namespaces: [authorizedNamespace] },
      { namespaces: ['foo', authorizedNamespace] },
    ],
  };

  // we don't know which base client method will be called; mock them all
  clientOpts.baseClient.bulkCreate.mockReturnValue(returnValue as any);
  clientOpts.baseClient.bulkGet.mockReturnValue(returnValue as any);
  clientOpts.baseClient.bulkUpdate.mockReturnValue(returnValue as any);
  clientOpts.baseClient.find.mockReturnValue(returnValue as any);

  const result = await fn.bind(client)(...Object.values(args));
  expect(result).toEqual(
    expect.objectContaining({
      saved_objects: [
        { namespaces: ['?'] },
        { namespaces: [authorizedNamespace] },
        { namespaces: [authorizedNamespace, '?'] },
      ],
    })
  );

  expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledTimes(2);
  expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenLastCalledWith('login:', [
    'foo',
    authorizedNamespace,
  ]);
};

function getMockCheckPrivilegesSuccess(actions: string | string[], namespaces?: string | string[]) {
  const _namespaces = Array.isArray(namespaces) ? namespaces : [namespaces || 'default'];
  const _actions = Array.isArray(actions) ? actions : [actions];
  return {
    hasAllRequested: true,
    username: USERNAME,
    privileges: _namespaces
      .map((resource) =>
        _actions.map((action) => ({
          resource,
          privilege: action,
          authorized: true,
        }))
      )
      .flat(),
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
    privileges: _namespaces
      .map((resource, idxa) =>
        _actions.map((action, idxb) => ({
          resource,
          privilege: action,
          authorized: idxa > 0 || idxb > 0,
        }))
      )
      .flat(),
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
  const privilege1 = `mock-saved_object:${type}/create`;
  const privilege2 = `mock-saved_object:${type}/update`;

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
    expect(clientOpts.auditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledTimes(1);
    expect(clientOpts.auditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
      USERNAME,
      'addToNamespacesCreate',
      [type],
      namespaces.sort(),
      [{ privilege: privilege1, spaceId: newNs1 }],
      { id, type, namespaces, options: {} }
    );
    expect(clientOpts.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
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
    expect(clientOpts.auditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledTimes(1);
    expect(
      clientOpts.auditLogger.savedObjectsAuthorizationFailure
    ).toHaveBeenLastCalledWith(
      USERNAME,
      'addToNamespacesUpdate',
      [type],
      [currentNs],
      [{ privilege: privilege2, spaceId: currentNs }],
      { id, type, namespaces, options: {} }
    );
    expect(clientOpts.auditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledTimes(1);
  });

  test(`returns result of baseClient.addToNamespaces when authorized`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.addToNamespaces.mockReturnValue(apiCallReturnValue as any);

    const result = await client.addToNamespaces(type, id, namespaces);
    expect(result).toBe(apiCallReturnValue);

    expect(clientOpts.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(clientOpts.auditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledTimes(2);
    expect(clientOpts.auditLogger.savedObjectsAuthorizationSuccess).toHaveBeenNthCalledWith(
      1,
      USERNAME,
      'addToNamespacesCreate', // action for privilege check is 'create', but auditAction is 'addToNamespacesCreate'
      [type],
      namespaces.sort(),
      { type, id, namespaces, options: {} }
    );
    expect(clientOpts.auditLogger.savedObjectsAuthorizationSuccess).toHaveBeenNthCalledWith(
      2,
      USERNAME,
      'addToNamespacesUpdate', // action for privilege check is 'update', but auditAction is 'addToNamespacesUpdate'
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
      [privilege1],
      namespaces
    );
    expect(clientOpts.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenNthCalledWith(
      2,
      [privilege2],
      undefined // default namespace
    );
  });
});

describe('#bulkCreate', () => {
  const attributes = { some: 'attr' };
  const obj1 = Object.freeze({ type: 'foo', otherThing: 'sup', attributes });
  const obj2 = Object.freeze({ type: 'bar', otherThing: 'everyone', attributes });
  const options = Object.freeze({ namespace: 'some-ns' });

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    const objects = [obj1];
    await expectGeneralError(client.bulkCreate, { objects });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const objects = [obj1, obj2];
    await expectForbiddenError(client.bulkCreate, { objects, options });
  });

  test(`returns result of baseClient.bulkCreate when authorized`, async () => {
    const apiCallReturnValue = { saved_objects: [], foo: 'bar' };
    clientOpts.baseClient.bulkCreate.mockReturnValue(apiCallReturnValue as any);

    const objects = [obj1, obj2];
    const result = await expectSuccess(client.bulkCreate, { objects, options });
    expect(result).toEqual(apiCallReturnValue);
  });

  test(`checks privileges for user, actions, and namespace`, async () => {
    const objects = [obj1, obj2];
    await expectPrivilegeCheck(client.bulkCreate, { objects, options });
  });

  test(`filters namespaces that the user doesn't have access to`, async () => {
    const objects = [obj1, obj2];
    await expectObjectsNamespaceFiltering(client.bulkCreate, { objects, options });
  });
});

describe('#bulkGet', () => {
  const obj1 = Object.freeze({ type: 'foo', id: 'foo-id' });
  const obj2 = Object.freeze({ type: 'bar', id: 'bar-id' });
  const options = Object.freeze({ namespace: 'some-ns' });

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    const objects = [obj1];
    await expectGeneralError(client.bulkGet, { objects });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const objects = [obj1, obj2];
    await expectForbiddenError(client.bulkGet, { objects, options });
  });

  test(`returns result of baseClient.bulkGet when authorized`, async () => {
    const apiCallReturnValue = { saved_objects: [], foo: 'bar' };
    clientOpts.baseClient.bulkGet.mockReturnValue(apiCallReturnValue as any);

    const objects = [obj1, obj2];
    const result = await expectSuccess(client.bulkGet, { objects, options });
    expect(result).toEqual(apiCallReturnValue);
  });

  test(`checks privileges for user, actions, and namespace`, async () => {
    const objects = [obj1, obj2];
    await expectPrivilegeCheck(client.bulkGet, { objects, options });
  });

  test(`filters namespaces that the user doesn't have access to`, async () => {
    const objects = [obj1, obj2];
    await expectObjectsNamespaceFiltering(client.bulkGet, { objects, options });
  });
});

describe('#bulkUpdate', () => {
  const obj1 = Object.freeze({ type: 'foo', id: 'foo-id', attributes: { some: 'attr' } });
  const obj2 = Object.freeze({ type: 'bar', id: 'bar-id', attributes: { other: 'attr' } });
  const options = Object.freeze({ namespace: 'some-ns' });

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    const objects = [obj1];
    await expectGeneralError(client.bulkUpdate, { objects });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const objects = [obj1, obj2];
    await expectForbiddenError(client.bulkUpdate, { objects, options });
  });

  test(`returns result of baseClient.bulkUpdate when authorized`, async () => {
    const apiCallReturnValue = { saved_objects: [], foo: 'bar' };
    clientOpts.baseClient.bulkUpdate.mockReturnValue(apiCallReturnValue as any);

    const objects = [obj1, obj2];
    const result = await expectSuccess(client.bulkUpdate, { objects, options });
    expect(result).toEqual(apiCallReturnValue);
  });

  test(`checks privileges for user, actions, and namespace`, async () => {
    const objects = [obj1, obj2];
    await expectPrivilegeCheck(client.bulkUpdate, { objects, options });
  });

  test(`filters namespaces that the user doesn't have access to`, async () => {
    const objects = [obj1, obj2];
    await expectObjectsNamespaceFiltering(client.bulkUpdate, { objects, options });
  });
});

describe('#create', () => {
  const type = 'foo';
  const attributes = { some_attr: 's' };
  const options = Object.freeze({ namespace: 'some-ns' });

  test(`throws decorated GeneralError when checkPrivileges.globally rejects promise`, async () => {
    await expectGeneralError(client.create, { type });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    await expectForbiddenError(client.create, { type, attributes, options });
  });

  test(`returns result of baseClient.create when authorized`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.create.mockResolvedValue(apiCallReturnValue as any);

    const result = await expectSuccess(client.create, { type, attributes, options });
    expect(result).toBe(apiCallReturnValue);
  });

  test(`checks privileges for user, actions, and namespace`, async () => {
    await expectPrivilegeCheck(client.create, { type, attributes, options });
  });

  test(`filters namespaces that the user doesn't have access to`, async () => {
    await expectObjectNamespaceFiltering(client.create, { type, attributes, options });
  });
});

describe('#delete', () => {
  const type = 'foo';
  const id = `${type}-id`;
  const options = Object.freeze({ namespace: 'some-ns' });

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    await expectGeneralError(client.delete, { type, id });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    await expectForbiddenError(client.delete, { type, id, options });
  });

  test(`returns result of internalRepository.delete when authorized`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.delete.mockReturnValue(apiCallReturnValue as any);

    const result = await expectSuccess(client.delete, { type, id, options });
    expect(result).toBe(apiCallReturnValue);
  });

  test(`checks privileges for user, actions, and namespace`, async () => {
    await expectPrivilegeCheck(client.delete, { type, id, options });
  });
});

describe('#find', () => {
  const type1 = 'foo';
  const type2 = 'bar';

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    await expectGeneralError(client.find, { type: type1 });
  });

  test(`throws decorated ForbiddenError when type's singular and unauthorized`, async () => {
    const options = Object.freeze({ type: type1, namespaces: ['some-ns'] });
    await expectForbiddenError(client.find, { options });
  });

  test(`throws decorated ForbiddenError when type's an array and unauthorized`, async () => {
    const options = Object.freeze({ type: [type1, type2], namespaces: ['some-ns'] });
    await expectForbiddenError(client.find, { options });
  });

  test(`returns result of baseClient.find when authorized`, async () => {
    const apiCallReturnValue = { saved_objects: [], foo: 'bar' };
    clientOpts.baseClient.find.mockReturnValue(apiCallReturnValue as any);

    const options = Object.freeze({ type: type1, namespaces: ['some-ns'] });
    const result = await expectSuccess(client.find, { options });
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

    const options = Object.freeze({ type: [type1, type2], namespaces: ['some-ns'] });
    await expect(client.find(options)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"_find across namespaces is not permitted when the Spaces plugin is disabled."`
    );
  });

  test(`checks privileges for user, actions, and namespaces`, async () => {
    const options = Object.freeze({ type: [type1, type2], namespaces: ['some-ns'] });
    await expectPrivilegeCheck(client.find, { options });
  });

  test(`filters namespaces that the user doesn't have access to`, async () => {
    const options = Object.freeze({ type: [type1, type2], namespaces: ['some-ns'] });
    await expectObjectsNamespaceFiltering(client.find, { options });
  });
});

describe('#get', () => {
  const type = 'foo';
  const id = `${type}-id`;
  const options = Object.freeze({ namespace: 'some-ns' });

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    await expectGeneralError(client.get, { type, id });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    await expectForbiddenError(client.get, { type, id, options });
  });

  test(`returns result of baseClient.get when authorized`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.get.mockReturnValue(apiCallReturnValue as any);

    const result = await expectSuccess(client.get, { type, id, options });
    expect(result).toBe(apiCallReturnValue);
  });

  test(`checks privileges for user, actions, and namespace`, async () => {
    await expectPrivilegeCheck(client.get, { type, id, options });
  });

  test(`filters namespaces that the user doesn't have access to`, async () => {
    await expectObjectNamespaceFiltering(client.get, { type, id, options });
  });
});

describe('#deleteFromNamespaces', () => {
  const type = 'foo';
  const id = `${type}-id`;
  const namespace1 = 'foo-namespace';
  const namespace2 = 'bar-namespace';
  const namespaces = [namespace1, namespace2];
  const privilege = `mock-saved_object:${type}/delete`;

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
    expect(clientOpts.auditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledTimes(1);
    expect(clientOpts.auditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
      USERNAME,
      'deleteFromNamespaces', // action for privilege check is 'delete', but auditAction is 'deleteFromNamespaces'
      [type],
      namespaces.sort(),
      [{ privilege, spaceId: namespace1 }],
      { type, id, namespaces, options: {} }
    );
    expect(clientOpts.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`returns result of baseClient.deleteFromNamespaces when authorized`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.deleteFromNamespaces.mockReturnValue(apiCallReturnValue as any);

    const result = await client.deleteFromNamespaces(type, id, namespaces);
    expect(result).toBe(apiCallReturnValue);

    expect(clientOpts.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(clientOpts.auditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledTimes(1);
    expect(clientOpts.auditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
      USERNAME,
      'deleteFromNamespaces', // action for privilege check is 'delete', but auditAction is 'deleteFromNamespaces'
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
});

describe('#update', () => {
  const type = 'foo';
  const id = `${type}-id`;
  const attributes = { some: 'attr' };
  const options = Object.freeze({ namespace: 'some-ns' });

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    await expectGeneralError(client.update, { type, id, attributes });
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    await expectForbiddenError(client.update, { type, id, attributes, options });
  });

  test(`returns result of baseClient.update when authorized`, async () => {
    const apiCallReturnValue = Symbol();
    clientOpts.baseClient.update.mockReturnValue(apiCallReturnValue as any);

    const result = await expectSuccess(client.update, { type, id, attributes, options });
    expect(result).toBe(apiCallReturnValue);
  });

  test(`checks privileges for user, actions, and namespace`, async () => {
    await expectPrivilegeCheck(client.update, { type, id, attributes, options });
  });

  test(`filters namespaces that the user doesn't have access to`, async () => {
    await expectObjectNamespaceFiltering(client.update, { type, id, attributes, options });
  });
});

describe('other', () => {
  test(`assigns errors from constructor to .errors`, () => {
    expect(client.errors).toBe(clientOpts.errors);
  });
});
