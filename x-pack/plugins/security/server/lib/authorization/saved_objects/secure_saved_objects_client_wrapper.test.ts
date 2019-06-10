/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SecureSavedObjectsClientWrapper,
  SecureSavedObjectsClientWrapperDeps,
} from './secure_saved_objects_client_wrapper';
import { SavedObjectsClientContract } from 'src/legacy/server/saved_objects';
import { ensureSavedObjectsPrivilegesFactory } from './ensure_saved_objects_privileges';
import { Actions } from '../actions';

const createMockErrors = () => {
  const forbiddenError = new Error('Mock ForbiddenError');
  const generalError = new Error('Mock GeneralError');

  return {
    forbiddenError,
    decorateForbiddenError: jest.fn().mockReturnValue(forbiddenError),
    generalError,
    decorateGeneralError: jest.fn().mockReturnValue(generalError),
  };
};

const createMockAuditLogger = () => {
  return {
    savedObjectsAuthorizationFailure: jest.fn(),
    savedObjectsAuthorizationSuccess: jest.fn(),
  };
};

const createMockActions = () => {
  return {
    savedObject: {
      get(type: string, action: string) {
        return `mock-saved_object:${type}/${action}`;
      },
    },
  } as Actions;
};

const createCheckSavedObjectsPrivileges = (checkPrivilegesImpl: () => Promise<any>) => {
  const mockAuditLogger = createMockAuditLogger();
  const mockErrors = createMockErrors();
  const mockActions = createMockActions();

  const ensureSavedObjectsPrivileges = jest.fn(
    ensureSavedObjectsPrivilegesFactory({
      actionsService: mockActions,
      auditLogger: mockAuditLogger,
      checkPrivilegesWithRequest: () => ({
        atSpace: jest.fn().mockImplementationOnce(checkPrivilegesImpl),
        atSpaces: jest.fn().mockRejectedValue('atSpaces should not be called'),
        globally: jest.fn().mockRejectedValue('globally should not be called'),
      }),
      errors: mockErrors as any,
      request: null as any,
      spacesEnabled: true,
    })
  );

  return {
    mockActions,
    mockAuditLogger,
    mockErrors,
    ensureSavedObjectsPrivileges,
  };
};

describe('#errors', () => {
  test(`assigns errors from constructor to .errors`, () => {
    const errors = Symbol();

    const { ensureSavedObjectsPrivileges } = createCheckSavedObjectsPrivileges(() => {
      throw new Error('An actual error would happen here');
    });

    const client = new SecureSavedObjectsClientWrapper(({
      ensureSavedObjectsPrivileges,
      errors,
    } as unknown) as SecureSavedObjectsClientWrapperDeps);

    expect(client.errors).toBe(errors);
  });
});

describe(`spaces disabled`, () => {
  describe('#create', () => {
    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const {
        mockErrors,
        mockAuditLogger,
        ensureSavedObjectsPrivileges,
      } = createCheckSavedObjectsPrivileges(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'create')]: false,
        },
      }));

      const client = new SecureSavedObjectsClientWrapper({
        baseClient: (null as unknown) as SavedObjectsClientContract,
        ensureSavedObjectsPrivileges,
        errors: mockErrors as any,
      });
      const attributes = Symbol();
      const options = Symbol();

      await expect(client.create(type, attributes as any, options as any)).rejects.toThrowError(
        mockErrors.forbiddenError
      );

      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'create', undefined, {
        attributes,
        options,
        type,
      });
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'create',
        [type],
        [mockActions.savedObject.get(type, 'create')],
        {
          type,
          attributes,
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`passes options.namespace to ensureSavedObjectsPrivileges`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = ({
        create: jest.fn().mockReturnValue(returnValue),
      } as unknown) as SavedObjectsClientContract;

      const { ensureSavedObjectsPrivileges } = createCheckSavedObjectsPrivileges(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'create')]: true,
        },
      }));

      const client = new SecureSavedObjectsClientWrapper({
        baseClient: mockBaseClient,
        ensureSavedObjectsPrivileges,
        errors: null as any,
      });
      const attributes = Symbol();
      const options = {
        namespace: 'my-namespace',
      };

      const result = await client.create(type, attributes as any, options);

      expect(result).toBe(returnValue);
      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'create', options.namespace, {
        attributes,
        options,
        type,
      });
    });

    test(`returns result of baseClient.create when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = ({
        create: jest.fn().mockReturnValue(returnValue),
      } as unknown) as SavedObjectsClientContract;
      const { mockAuditLogger, ensureSavedObjectsPrivileges } = createCheckSavedObjectsPrivileges(
        async () => ({
          hasAllRequested: true,
          username,
          privileges: {
            [mockActions.savedObject.get(type, 'create')]: true,
          },
        })
      );

      const client = new SecureSavedObjectsClientWrapper({
        baseClient: mockBaseClient,
        ensureSavedObjectsPrivileges,
        errors: null as any,
      });
      const attributes = Symbol();
      const options = Symbol();

      const result = await client.create(type, attributes as any, options as any);

      expect(result).toBe(returnValue);
      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'create', undefined, {
        attributes,
        options,
        type,
      });
      expect(mockBaseClient.create).toHaveBeenCalledWith(type, attributes, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'create',
        [type],
        {
          type,
          attributes,
          options,
        }
      );
    });
  });

  describe('#bulkCreate', () => {
    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const mockActions = createMockActions();
      const {
        mockAuditLogger,
        mockErrors,
        ensureSavedObjectsPrivileges,
      } = createCheckSavedObjectsPrivileges(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type1, 'bulk_create')]: false,
          [mockActions.savedObject.get(type2, 'bulk_create')]: true,
        },
      }));
      const client = new SecureSavedObjectsClientWrapper({
        baseClient: (null as unknown) as SavedObjectsClientContract,
        ensureSavedObjectsPrivileges,
        errors: mockErrors as any,
      });
      const objects = [
        { type: type1, attributes: {} },
        { type: type1, attributes: {} },
        { type: type2, attributes: {} },
      ];
      const options = Symbol();

      await expect(client.bulkCreate(objects, options as any)).rejects.toThrowError(
        mockErrors.forbiddenError
      );

      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(
        [type1, type2],
        'bulk_create',
        undefined,
        {
          objects,
          options,
        }
      );
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'bulk_create',
        [type1, type2],
        [mockActions.savedObject.get(type1, 'bulk_create')],
        {
          objects,
          options,
        }
      );
    });

    test(`passes options.namespace to ensureSavedObjectsPrivileges`, async () => {
      const username = Symbol();
      const type1 = 'foo';
      const type2 = 'bar';
      const returnValue = Symbol();
      const mockBaseClient = ({
        bulkCreate: jest.fn().mockReturnValue(returnValue),
      } as unknown) as SavedObjectsClientContract;

      const mockActions = createMockActions();
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type1, 'bulk_create')]: true,
          [mockActions.savedObject.get(type2, 'bulk_create')]: true,
        },
      }));

      const { ensureSavedObjectsPrivileges } = createCheckSavedObjectsPrivileges(
        mockCheckPrivileges
      );

      const client = new SecureSavedObjectsClientWrapper({
        baseClient: mockBaseClient,
        ensureSavedObjectsPrivileges,
        errors: null as any,
      });
      const objects = [
        { type: type1, otherThing: 'sup', attributes: {} },
        { type: type2, otherThing: 'everyone', attributes: {} },
      ];
      const options = { namespace: 'my-namespace' };

      const result = await client.bulkCreate(objects, options);

      expect(result).toBe(returnValue);
      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(
        [type1, type2],
        'bulk_create',
        options.namespace,
        {
          objects,
          options,
        }
      );
    });

    test(`returns result of baseClient.bulkCreate when authorized`, async () => {
      const username = Symbol();
      const type1 = 'foo';
      const type2 = 'bar';
      const returnValue = Symbol();
      const mockBaseClient = ({
        bulkCreate: jest.fn().mockReturnValue(returnValue),
      } as unknown) as SavedObjectsClientContract;

      const mockActions = createMockActions();
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type1, 'bulk_create')]: true,
          [mockActions.savedObject.get(type2, 'bulk_create')]: true,
        },
      }));

      const { mockAuditLogger, ensureSavedObjectsPrivileges } = createCheckSavedObjectsPrivileges(
        mockCheckPrivileges
      );

      const client = new SecureSavedObjectsClientWrapper({
        baseClient: mockBaseClient,
        ensureSavedObjectsPrivileges,
        errors: null as any,
      });
      const objects = [
        { type: type1, otherThing: 'sup', attributes: {} },
        { type: type2, otherThing: 'everyone', attributes: {} },
      ];
      const options = Symbol();

      const result = await client.bulkCreate(objects, options as any);

      expect(result).toBe(returnValue);
      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(
        [type1, type2],
        'bulk_create',
        undefined,
        {
          objects,
          options,
        }
      );
      expect(mockBaseClient.bulkCreate).toHaveBeenCalledWith(objects, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'bulk_create',
        [type1, type2],
        {
          objects,
          options,
        }
      );
    });
  });

  describe('#delete', () => {
    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'delete')]: false,
        },
      }));
      const {
        mockAuditLogger,
        mockErrors,
        ensureSavedObjectsPrivileges,
      } = createCheckSavedObjectsPrivileges(mockCheckPrivileges);
      const client = new SecureSavedObjectsClientWrapper({
        baseClient: (null as unknown) as SavedObjectsClientContract,
        ensureSavedObjectsPrivileges,
        errors: mockErrors as any,
      });
      const id = Symbol();
      const options = Symbol();

      await expect(client.delete(type, id as any, options as any)).rejects.toThrowError(
        mockErrors.forbiddenError
      );

      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'delete', undefined, {
        type,
        id,
        options,
      });
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'delete',
        [type],
        [mockActions.savedObject.get(type, 'delete')],
        {
          type,
          id,
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`passes options.namespace to ensureSavedObjectsPrivileges`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = ({
        delete: jest.fn().mockReturnValue(returnValue),
      } as unknown) as SavedObjectsClientContract;
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'delete')]: true,
        },
      }));
      const { ensureSavedObjectsPrivileges } = createCheckSavedObjectsPrivileges(
        mockCheckPrivileges
      );

      const client = new SecureSavedObjectsClientWrapper({
        baseClient: mockBaseClient,
        ensureSavedObjectsPrivileges,
        errors: null as any,
      });
      const id = Symbol();
      const options = { namespace: 'my-namespace' };

      const result = await client.delete(type, id as any, options);

      expect(result).toBe(returnValue);
      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'delete', options.namespace, {
        type,
        options,
        id,
      });
    });

    test(`returns result of internalRepository.delete when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = ({
        delete: jest.fn().mockReturnValue(returnValue),
      } as unknown) as SavedObjectsClientContract;
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'delete')]: true,
        },
      }));
      const { mockAuditLogger, ensureSavedObjectsPrivileges } = createCheckSavedObjectsPrivileges(
        mockCheckPrivileges
      );

      const client = new SecureSavedObjectsClientWrapper({
        baseClient: mockBaseClient,
        ensureSavedObjectsPrivileges,
        errors: null as any,
      });
      const id = Symbol();
      const options = Symbol();

      const result = await client.delete(type, id as any, options as any);

      expect(result).toBe(returnValue);
      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'delete', undefined, {
        type,
        options,
        id,
      });
      expect(mockBaseClient.delete).toHaveBeenCalledWith(type, id, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'delete',
        [type],
        {
          type,
          id,
          options,
        }
      );
    });
  });

  describe('#find', () => {
    test(`throws decorated ForbiddenError when type's singular and unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'find')]: false,
        },
      }));
      const {
        mockAuditLogger,
        mockErrors,
        ensureSavedObjectsPrivileges,
      } = createCheckSavedObjectsPrivileges(mockCheckPrivileges);

      const client = new SecureSavedObjectsClientWrapper({
        baseClient: (null as unknown) as SavedObjectsClientContract,
        ensureSavedObjectsPrivileges,
        errors: mockErrors as any,
      });
      const options = { type };

      await expect(client.find(options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'find', undefined, {
        options,
      });
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'find',
        [type],
        [mockActions.savedObject.get(type, 'find')],
        {
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when type's an array and unauthorized`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type1, 'find')]: false,
          [mockActions.savedObject.get(type2, 'find')]: true,
        },
      }));
      const {
        mockAuditLogger,
        mockErrors,
        ensureSavedObjectsPrivileges,
      } = createCheckSavedObjectsPrivileges(mockCheckPrivileges);
      const client = new SecureSavedObjectsClientWrapper({
        baseClient: (null as unknown) as SavedObjectsClientContract,
        ensureSavedObjectsPrivileges,
        errors: mockErrors as any,
      });
      const options = { type: [type1, type2] };

      await expect(client.find(options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith([type1, type2], 'find', undefined, {
        options,
      });
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'find',
        [type1, type2],
        [mockActions.savedObject.get(type1, 'find')],
        {
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`passes options.namespace to ensureSavedObjectsPrivileges`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = ({
        find: jest.fn().mockReturnValue(returnValue),
      } as unknown) as SavedObjectsClientContract;
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'find')]: true,
        },
      }));
      const { ensureSavedObjectsPrivileges } = createCheckSavedObjectsPrivileges(
        mockCheckPrivileges
      );
      const client = new SecureSavedObjectsClientWrapper({
        baseClient: mockBaseClient,
        ensureSavedObjectsPrivileges,
        errors: null as any,
      });
      const options = { type, namespace: 'my-namespace' };

      const result = await client.find(options);

      expect(result).toBe(returnValue);

      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'find', options.namespace, {
        options,
      });
    });

    test(`returns result of baseClient.find when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = ({
        find: jest.fn().mockReturnValue(returnValue),
      } as unknown) as SavedObjectsClientContract;
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'find')]: true,
        },
      }));
      const { mockAuditLogger, ensureSavedObjectsPrivileges } = createCheckSavedObjectsPrivileges(
        mockCheckPrivileges
      );
      const client = new SecureSavedObjectsClientWrapper({
        baseClient: mockBaseClient,
        ensureSavedObjectsPrivileges,
        errors: null as any,
      });
      const options = { type };

      const result = await client.find(options);

      expect(result).toBe(returnValue);

      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'find', undefined, {
        options,
      });
      expect(mockBaseClient.find).toHaveBeenCalledWith({ type });
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'find',
        [type],
        {
          options,
        }
      );
    });
  });

  describe('#bulkGet', () => {
    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type1, 'bulk_get')]: false,
          [mockActions.savedObject.get(type2, 'bulk_get')]: true,
        },
      }));
      const {
        mockErrors,
        mockAuditLogger,
        ensureSavedObjectsPrivileges,
      } = createCheckSavedObjectsPrivileges(mockCheckPrivileges);
      const client = new SecureSavedObjectsClientWrapper({
        baseClient: (null as unknown) as SavedObjectsClientContract,
        ensureSavedObjectsPrivileges,
        errors: mockErrors as any,
      });
      const objects = [
        { type: type1, id: 'foo' },
        { type: type1, id: 'bar' },
        { type: type2, id: 'baz' },
      ];
      const options = Symbol();

      await expect(client.bulkGet(objects, options as any)).rejects.toThrowError(
        mockErrors.forbiddenError
      );

      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(
        [type1, type2],
        'bulk_get',
        undefined,
        {
          objects,
          options,
        }
      );
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'bulk_get',
        [type1, type2],
        [mockActions.savedObject.get(type1, 'bulk_get')],
        {
          objects,
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`passes options.namespace to ensureSavedObjectsPrivileges`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = ({
        bulkGet: jest.fn().mockReturnValue(returnValue),
      } as unknown) as SavedObjectsClientContract;
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type1, 'bulk_get')]: true,
          [mockActions.savedObject.get(type2, 'bulk_get')]: true,
        },
      }));
      const { ensureSavedObjectsPrivileges } = createCheckSavedObjectsPrivileges(
        mockCheckPrivileges
      );
      const client = new SecureSavedObjectsClientWrapper({
        baseClient: mockBaseClient,
        ensureSavedObjectsPrivileges,
        errors: null as any,
      });
      const objects = [{ type: type1, id: 'foo-id' }, { type: type2, id: 'bar-id' }];
      const options = { namespace: 'my-namespace' };

      const result = await client.bulkGet(objects, options);

      expect(result).toBe(returnValue);

      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(
        [type1, type2],
        'bulk_get',
        options.namespace,
        {
          objects,
          options,
        }
      );
    });

    test(`returns result of baseClient.bulkGet when authorized`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = ({
        bulkGet: jest.fn().mockReturnValue(returnValue),
      } as unknown) as SavedObjectsClientContract;
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type1, 'bulk_get')]: true,
          [mockActions.savedObject.get(type2, 'bulk_get')]: true,
        },
      }));
      const { mockAuditLogger, ensureSavedObjectsPrivileges } = createCheckSavedObjectsPrivileges(
        mockCheckPrivileges
      );
      const client = new SecureSavedObjectsClientWrapper({
        baseClient: mockBaseClient,
        ensureSavedObjectsPrivileges,
        errors: null as any,
      });
      const objects = [{ type: type1, id: 'foo-id' }, { type: type2, id: 'bar-id' }];
      const options = Symbol();

      const result = await client.bulkGet(objects, options as any);

      expect(result).toBe(returnValue);

      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(
        [type1, type2],
        'bulk_get',
        undefined,
        {
          objects,
          options,
        }
      );
      expect(mockBaseClient.bulkGet).toHaveBeenCalledWith(objects, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'bulk_get',
        [type1, type2],
        {
          objects,
          options,
        }
      );
    });
  });

  describe('#get', () => {
    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'get')]: false,
        },
      }));
      const {
        mockAuditLogger,
        mockErrors,
        ensureSavedObjectsPrivileges,
      } = createCheckSavedObjectsPrivileges(mockCheckPrivileges);
      const client = new SecureSavedObjectsClientWrapper({
        baseClient: (null as unknown) as SavedObjectsClientContract,
        ensureSavedObjectsPrivileges,
        errors: mockErrors as any,
      });
      const id = Symbol();
      const options = Symbol();

      await expect(client.get(type, id as any, options as any)).rejects.toThrowError(
        mockErrors.forbiddenError
      );

      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'get', undefined, {
        type,
        id,
        options,
      });
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'get',
        [type],
        [mockActions.savedObject.get(type, 'get')],
        {
          type,
          id,
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`passes options.namespace to ensureSavedObjectsPrivileges`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = ({
        get: jest.fn().mockReturnValue(returnValue),
      } as unknown) as SavedObjectsClientContract;
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'get')]: true,
        },
      }));
      const { ensureSavedObjectsPrivileges } = createCheckSavedObjectsPrivileges(
        mockCheckPrivileges
      );
      const client = new SecureSavedObjectsClientWrapper({
        baseClient: mockBaseClient,
        ensureSavedObjectsPrivileges,
        errors: null as any,
      });
      const id = Symbol();
      const options = { namespace: 'my-namespace' };

      const result = await client.get(type, id as any, options);

      expect(result).toBe(returnValue);

      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'get', options.namespace, {
        type,
        id,
        options,
      });
    });

    test(`returns result of baseClient.get when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = ({
        get: jest.fn().mockReturnValue(returnValue),
      } as unknown) as SavedObjectsClientContract;
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'get')]: true,
        },
      }));
      const { mockAuditLogger, ensureSavedObjectsPrivileges } = createCheckSavedObjectsPrivileges(
        mockCheckPrivileges
      );
      const client = new SecureSavedObjectsClientWrapper({
        baseClient: mockBaseClient,
        ensureSavedObjectsPrivileges,
        errors: null as any,
      });
      const id = Symbol();
      const options = Symbol();

      const result = await client.get(type, id as any, options as any);

      expect(result).toBe(returnValue);

      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'get', undefined, {
        type,
        id,
        options,
      });
      expect(mockBaseClient.get).toHaveBeenCalledWith(type, id, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'get',
        [type],
        {
          type,
          id,
          options,
        }
      );
    });
  });

  describe('#update', () => {
    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: false,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'update')]: false,
        },
      }));
      const {
        mockAuditLogger,
        mockErrors,
        ensureSavedObjectsPrivileges,
      } = createCheckSavedObjectsPrivileges(mockCheckPrivileges);
      const client = new SecureSavedObjectsClientWrapper({
        baseClient: (null as unknown) as SavedObjectsClientContract,
        ensureSavedObjectsPrivileges,
        errors: mockErrors as any,
      });
      const id = Symbol();
      const attributes = Symbol();
      const options = Symbol();

      await expect(
        client.update(type, id as any, attributes as any, options as any)
      ).rejects.toThrowError(mockErrors.forbiddenError);

      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'update', undefined, {
        type,
        id,
        attributes,
        options,
      });
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'update',
        [type],
        [mockActions.savedObject.get(type, 'update')],
        {
          type,
          id,
          attributes,
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`passes options.namespace to ensureSavedObjectsPrivileges`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = ({
        update: jest.fn().mockReturnValue(returnValue),
      } as unknown) as SavedObjectsClientContract;
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'update')]: true,
        },
      }));
      const { ensureSavedObjectsPrivileges } = createCheckSavedObjectsPrivileges(
        mockCheckPrivileges
      );
      const client = new SecureSavedObjectsClientWrapper({
        baseClient: mockBaseClient,
        ensureSavedObjectsPrivileges,
        errors: null as any,
      });
      const id = Symbol();
      const attributes = Symbol();
      const options = { namespace: 'my-namespace' };
      const result = await client.update(type, id as any, attributes as any, options);

      expect(result).toBe(returnValue);

      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'update', options.namespace, {
        type,
        id,
        options,
        attributes,
      });
    });

    test(`returns result of baseClient.update when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = ({
        update: jest.fn().mockReturnValue(returnValue),
      } as unknown) as SavedObjectsClientContract;
      const mockCheckPrivileges = jest.fn(async () => ({
        hasAllRequested: true,
        username,
        privileges: {
          [mockActions.savedObject.get(type, 'update')]: true,
        },
      }));
      const { mockAuditLogger, ensureSavedObjectsPrivileges } = createCheckSavedObjectsPrivileges(
        mockCheckPrivileges
      );
      const client = new SecureSavedObjectsClientWrapper({
        baseClient: mockBaseClient,
        ensureSavedObjectsPrivileges,
        errors: null as any,
      });
      const id = Symbol();
      const attributes = Symbol();
      const options = Symbol();

      const result = await client.update(type, id as any, attributes as any, options as any);

      expect(result).toBe(returnValue);

      expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'update', undefined, {
        type,
        id,
        options,
        attributes,
      });
      expect(mockBaseClient.update).toHaveBeenCalledWith(type, id, attributes, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'update',
        [type],
        {
          type,
          id,
          attributes,
          options,
        }
      );
    });
  });
});
