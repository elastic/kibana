/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecureSavedObjectsClientWrapper } from './secure_saved_objects_client_wrapper';

const createMockErrors = () => {
  const forbiddenError = new Error('Mock ForbiddenError');
  const generalError = new Error('Mock GeneralError');

  return {
    forbiddenError,
    decorateForbiddenError: jest.fn().mockReturnValue(forbiddenError),
    generalError,
    decorateGeneralError: jest.fn().mockReturnValue(generalError)
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
    getSavedObjectAction(type, action) {
      return `mock-action:saved_objects/${type}/${action}`;
    }
  };
};

describe('#errors', () => {
  test(`assigns errors from constructor to .errors`, () => {
    const errors = Symbol();

    const client = new SecureSavedObjectsClientWrapper({
      checkPrivilegesWithRequest: () => {},
      errors
    });

    expect(client.errors).toBe(errors);
  });
});

describe(`spaces disabled`, () => {
  describe('#create', () => {
    test(`throws decorated GeneralError when checkPrivileges.globally rejects promise`, async () => {
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        globally: jest.fn(async () => {
          throw new Error('An actual error would happen here');
        })
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });

      await expect(client.create(type)).rejects.toThrowError(mockErrors.generalError);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'create')]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        globally: jest.fn(async () => ({
          hasAllRequested: false,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'create')]: false,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const attributes = Symbol();
      const options = Symbol();

      await expect(client.create(type, attributes, options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'create')]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'create',
        [type],
        [mockActions.getSavedObjectAction(type, 'create')],
        {
          type,
          attributes,
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.create when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = {
        create: jest.fn().mockReturnValue(returnValue)
      };
      const mockCheckPrivileges = {
        globally: jest.fn(async () => ({
          hasAllRequested: true,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'create')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const attributes = Symbol();
      const options = Symbol();

      const result = await client.create(type, attributes, options);

      expect(result).toBe(returnValue);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'create')]);
      expect(mockBaseClient.create).toHaveBeenCalledWith(type, attributes, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'create', [type], {
        type,
        attributes,
        options,
      });
    });
  });

  describe('#bulkCreate', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        globally: jest.fn(async () => {
          throw new Error('An actual error would happen here');
        })
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });

      await expect(client.bulkCreate([{ type }])).rejects.toThrowError(mockErrors.generalError);

      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'bulk_create')]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        globally: jest.fn(async () => ({
          hasAllRequested: false,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type1, 'bulk_create')]: false,
            [mockActions.getSavedObjectAction(type2, 'bulk_create')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const objects = [
        { type: type1 },
        { type: type1 },
        { type: type2 },
      ];
      const options = Symbol();

      await expect(client.bulkCreate(objects, options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([
        mockActions.getSavedObjectAction(type1, 'bulk_create'),
        mockActions.getSavedObjectAction(type2, 'bulk_create'),
      ]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'bulk_create',
        [type1, type2],
        [mockActions.getSavedObjectAction(type1, 'bulk_create')],
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
      const mockBaseClient = {
        bulkCreate: jest.fn().mockReturnValue(returnValue)
      };
      const mockActions = createMockActions();
      const mockCheckPrivileges = {
        globally: jest.fn(async () => ({
          hasAllRequested: true,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type1, 'bulk_create')]: true,
            [mockActions.getSavedObjectAction(type2, 'bulk_create')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const objects = [
        { type: type1, otherThing: 'sup' },
        { type: type2, otherThing: 'everyone' },
      ];
      const options = Symbol();

      const result = await client.bulkCreate(objects, options);

      expect(result).toBe(returnValue);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([
        mockActions.getSavedObjectAction(type1, 'bulk_create'),
        mockActions.getSavedObjectAction(type2, 'bulk_create'),
      ]);
      expect(mockBaseClient.bulkCreate).toHaveBeenCalledWith(objects, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'bulk_create', [type1, type2], {
        objects,
        options,
      });
    });
  });

  describe('#delete', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        globally: jest.fn(async () => {
          throw new Error('An actual error would happen here');
        })
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });

      await expect(client.delete(type)).rejects.toThrowError(mockErrors.generalError);

      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'delete')]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        globally: jest.fn(async () => ({
          hasAllRequested: false,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'delete')]: false,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const id = Symbol();

      await expect(client.delete(type, id)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'delete')]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'delete',
        [type],
        [mockActions.getSavedObjectAction(type, 'delete')],
        {
          type,
          id,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of internalRepository.delete when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = {
        delete: jest.fn().mockReturnValue(returnValue)
      };
      const mockCheckPrivileges = {
        globally: jest.fn(async () => ({
          hasAllRequested: true,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'delete')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const id = Symbol();
      const options = Symbol();

      const result = await client.delete(type, id, options);

      expect(result).toBe(returnValue);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'delete')]);
      expect(mockBaseClient.delete).toHaveBeenCalledWith(type, id, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'delete', [type], {
        type,
        id,
        options,
      });
    });
  });

  describe('#find', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        globally: jest.fn(async () => {
          throw new Error('An actual error would happen here');
        })
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });

      await expect(client.find({ type })).rejects.toThrowError(mockErrors.generalError);

      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'find')]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when type's singular and unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        globally: jest.fn(async () => ({
          hasAllRequested: false,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'find')]: false,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const options = { type };

      await expect(client.find(options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'find')]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'find',
        [type],
        [mockActions.getSavedObjectAction(type, 'find')],
        {
          options
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when type's an array and unauthorized`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        globally: jest.fn(async () => ({
          hasAllRequested: false,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type1, 'find')]: false,
            [mockActions.getSavedObjectAction(type2, 'find')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();

      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const options = { type: [type1, type2] };

      await expect(client.find(options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([
        mockActions.getSavedObjectAction(type1, 'find'),
        mockActions.getSavedObjectAction(type2, 'find')
      ]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'find',
        [type1, type2],
        [mockActions.getSavedObjectAction(type1, 'find')],
        {
          options
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.find when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = {
        find: jest.fn().mockReturnValue(returnValue)
      };
      const mockCheckPrivileges = {
        globally: jest.fn(async () => ({
          hasAllRequested: true,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'find')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const options = { type };

      const result = await client.find(options);

      expect(result).toBe(returnValue);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'find')]);
      expect(mockBaseClient.find).toHaveBeenCalledWith({ type });
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'find', [type], {
        options,
      });
    });
  });

  describe('#bulkGet', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        globally: jest.fn(async () => {
          throw new Error('An actual error would happen here');
        })
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });

      await expect(client.bulkGet([{ type }])).rejects.toThrowError(mockErrors.generalError);

      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'bulk_get')]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        globally: jest.fn(async () => ({
          hasAllRequested: false,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type1, 'bulk_get')]: false,
            [mockActions.getSavedObjectAction(type2, 'bulk_get')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const objects = [
        { type: type1 },
        { type: type1 },
        { type: type2 },
      ];
      const options = Symbol();

      await expect(client.bulkGet(objects, options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([
        mockActions.getSavedObjectAction(type1, 'bulk_get'),
        mockActions.getSavedObjectAction(type2, 'bulk_get'),
      ]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'bulk_get',
        [type1, type2],
        [mockActions.getSavedObjectAction(type1, 'bulk_get')],
        {
          objects,
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.bulkGet when authorized`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = {
        bulkGet: jest.fn().mockReturnValue(returnValue)
      };
      const mockCheckPrivileges = {
        globally: jest.fn(async () => ({
          hasAllRequested: true,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type1, 'bulk_get')]: true,
            [mockActions.getSavedObjectAction(type2, 'bulk_get')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const objects = [
        { type: type1, id: 'foo-id' },
        { type: type2, id: 'bar-id' },
      ];
      const options = Symbol();

      const result = await client.bulkGet(objects, options);

      expect(result).toBe(returnValue);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([
        mockActions.getSavedObjectAction(type1, 'bulk_get'),
        mockActions.getSavedObjectAction(type2, 'bulk_get'),
      ]);
      expect(mockBaseClient.bulkGet).toHaveBeenCalledWith(objects, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'bulk_get', [type1, type2], {
        objects,
        options,
      });
    });
  });

  describe('#get', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        globally: jest.fn(async () => {
          throw new Error('An actual error would happen here');
        })
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });

      await expect(client.get(type)).rejects.toThrowError(mockErrors.generalError);

      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'get')]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        globally: jest.fn(async () => ({
          hasAllRequested: false,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'get')]: false,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const id = Symbol();
      const options = Symbol();

      await expect(client.get(type, id, options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'get')]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'get',
        [type],
        [mockActions.getSavedObjectAction(type, 'get')],
        {
          type,
          id,
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.get when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = {
        get: jest.fn().mockReturnValue(returnValue)
      };
      const mockCheckPrivileges = {
        globally: jest.fn(async () => ({
          hasAllRequested: true,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'get')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const id = Symbol();
      const options = Symbol();

      const result = await client.get(type, id, options);

      expect(result).toBe(returnValue);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'get')]);
      expect(mockBaseClient.get).toHaveBeenCalledWith(type, id, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'get', [type], {
        type,
        id,
        options
      });
    });
  });

  describe('#update', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        globally: jest.fn(async () => {
          throw new Error('An actual error would happen here');
        })
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });

      await expect(client.update(type)).rejects.toThrowError(mockErrors.generalError);

      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'update')]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        globally: jest.fn(async () => ({
          hasAllRequested: false,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'update')]: false,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const id = Symbol();
      const attributes = Symbol();
      const options = Symbol();

      await expect(client.update(type, id, attributes, options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'update')]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'update',
        [type],
        [mockActions.getSavedObjectAction(type, 'update')],
        {
          type,
          id,
          attributes,
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.update when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = {
        update: jest.fn().mockReturnValue(returnValue)
      };
      const mockCheckPrivileges = {
        globally: jest.fn(async () => ({
          hasAllRequested: true,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'update')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: null,
      });
      const id = Symbol();
      const attributes = Symbol();
      const options = Symbol();

      const result = await client.update(type, id, attributes, options);

      expect(result).toBe(returnValue);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'update')]);
      expect(mockBaseClient.update).toHaveBeenCalledWith(type, id, attributes, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'update', [type], {
        type,
        id,
        attributes,
        options,
      });
    });
  });
});

describe(`spaces enabled`, () => {
  describe('#create', () => {
    test(`throws decorated GeneralError when checkPrivileges.globally rejects promise`, async () => {
      const spaceId = 'space_1';
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => {
          throw new Error('An actual error would happen here');
        })
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });

      await expect(client.create(type)).rejects.toThrowError(mockErrors.generalError);
      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [mockActions.getSavedObjectAction(type, 'create')]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const spaceId = 'space_1';
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => ({
          hasAllRequested: false,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'create')]: false,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });
      const attributes = Symbol();
      const options = Symbol();

      await expect(client.create(type, attributes, options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [mockActions.getSavedObjectAction(type, 'create')]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'create',
        [type],
        [mockActions.getSavedObjectAction(type, 'create')],
        {
          type,
          attributes,
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.create when authorized`, async () => {
      const spaceId = 'space_1';
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = {
        create: jest.fn().mockReturnValue(returnValue)
      };
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => ({
          hasAllRequested: true,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'create')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });
      const attributes = Symbol();
      const options = Symbol();

      const result = await client.create(type, attributes, options);

      expect(result).toBe(returnValue);
      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [mockActions.getSavedObjectAction(type, 'create')]);
      expect(mockBaseClient.create).toHaveBeenCalledWith(type, attributes, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'create', [type], {
        type,
        attributes,
        options,
      });
    });
  });

  describe('#bulkCreate', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const spaceId = 'space_1';
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => {
          throw new Error('An actual error would happen here');
        })
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });

      await expect(client.bulkCreate([{ type }])).rejects.toThrowError(mockErrors.generalError);

      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [mockActions.getSavedObjectAction(type, 'bulk_create')]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const spaceId = 'space_1';
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => ({
          hasAllRequested: false,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type1, 'bulk_create')]: false,
            [mockActions.getSavedObjectAction(type2, 'bulk_create')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });
      const objects = [
        { type: type1 },
        { type: type1 },
        { type: type2 },
      ];
      const options = Symbol();

      await expect(client.bulkCreate(objects, options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [
        mockActions.getSavedObjectAction(type1, 'bulk_create'),
        mockActions.getSavedObjectAction(type2, 'bulk_create'),
      ]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'bulk_create',
        [type1, type2],
        [mockActions.getSavedObjectAction(type1, 'bulk_create')],
        {
          objects,
          options,
        }
      );
    });

    test(`returns result of baseClient.bulkCreate when authorized`, async () => {
      const spaceId = 'space_1';
      const username = Symbol();
      const type1 = 'foo';
      const type2 = 'bar';
      const returnValue = Symbol();
      const mockBaseClient = {
        bulkCreate: jest.fn().mockReturnValue(returnValue)
      };
      const mockActions = createMockActions();
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => ({
          hasAllRequested: true,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type1, 'bulk_create')]: true,
            [mockActions.getSavedObjectAction(type2, 'bulk_create')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });
      const objects = [
        { type: type1, otherThing: 'sup' },
        { type: type2, otherThing: 'everyone' },
      ];
      const options = Symbol();

      const result = await client.bulkCreate(objects, options);

      expect(result).toBe(returnValue);
      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [
        mockActions.getSavedObjectAction(type1, 'bulk_create'),
        mockActions.getSavedObjectAction(type2, 'bulk_create'),
      ]);
      expect(mockBaseClient.bulkCreate).toHaveBeenCalledWith(objects, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'bulk_create', [type1, type2], {
        objects,
        options,
      });
    });
  });

  describe('#delete', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const spaceId = 'space_1';
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => {
          throw new Error('An actual error would happen here');
        })
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });

      await expect(client.delete(type)).rejects.toThrowError(mockErrors.generalError);

      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [mockActions.getSavedObjectAction(type, 'delete')]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const spaceId = 'space_1';
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => ({
          hasAllRequested: false,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'delete')]: false,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });
      const id = Symbol();

      await expect(client.delete(type, id)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [mockActions.getSavedObjectAction(type, 'delete')]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'delete',
        [type],
        [mockActions.getSavedObjectAction(type, 'delete')],
        {
          type,
          id,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of internalRepository.delete when authorized`, async () => {
      const spaceId = 'space_1';
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = {
        delete: jest.fn().mockReturnValue(returnValue)
      };
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => ({
          hasAllRequested: true,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'delete')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });
      const id = Symbol();
      const options = Symbol();

      const result = await client.delete(type, id, options);

      expect(result).toBe(returnValue);
      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [mockActions.getSavedObjectAction(type, 'delete')]);
      expect(mockBaseClient.delete).toHaveBeenCalledWith(type, id, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'delete', [type], {
        type,
        id,
        options,
      });
    });
  });

  describe('#find', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const spaceId = 'space_1';
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => {
          throw new Error('An actual error would happen here');
        })
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });

      await expect(client.find({ type })).rejects.toThrowError(mockErrors.generalError);

      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [mockActions.getSavedObjectAction(type, 'find')]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when type's singular and unauthorized`, async () => {
      const spaceId = 'space_1';
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => ({
          hasAllRequested: false,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'find')]: false,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });
      const options = { type };

      await expect(client.find(options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [mockActions.getSavedObjectAction(type, 'find')]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'find',
        [type],
        [mockActions.getSavedObjectAction(type, 'find')],
        {
          options
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when type's an array and unauthorized`, async () => {
      const spaceId = 'space_1';
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => ({
          hasAllRequested: false,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type1, 'find')]: false,
            [mockActions.getSavedObjectAction(type2, 'find')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();

      const mockAuditLogger = createMockAuditLogger();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });
      const options = { type: [type1, type2] };

      await expect(client.find(options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [
        mockActions.getSavedObjectAction(type1, 'find'),
        mockActions.getSavedObjectAction(type2, 'find')
      ]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'find',
        [type1, type2],
        [mockActions.getSavedObjectAction(type1, 'find')],
        {
          options
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.find when authorized`, async () => {
      const spaceId = 'space_1';
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = {
        find: jest.fn().mockReturnValue(returnValue)
      };
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => ({
          hasAllRequested: true,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'find')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });
      const options = { type };

      const result = await client.find(options);

      expect(result).toBe(returnValue);
      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [mockActions.getSavedObjectAction(type, 'find')]);
      expect(mockBaseClient.find).toHaveBeenCalledWith({ type });
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'find', [type], {
        options,
      });
    });
  });

  describe('#bulkGet', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const spaceId = 'space_1';
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => {
          throw new Error('An actual error would happen here');
        })
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });

      await expect(client.bulkGet([{ type }])).rejects.toThrowError(mockErrors.generalError);

      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [mockActions.getSavedObjectAction(type, 'bulk_get')]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const spaceId = 'space_1';
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => ({
          hasAllRequested: false,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type1, 'bulk_get')]: false,
            [mockActions.getSavedObjectAction(type2, 'bulk_get')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });
      const objects = [
        { type: type1 },
        { type: type1 },
        { type: type2 },
      ];
      const options = Symbol();

      await expect(client.bulkGet(objects, options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [
        mockActions.getSavedObjectAction(type1, 'bulk_get'),
        mockActions.getSavedObjectAction(type2, 'bulk_get'),
      ]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'bulk_get',
        [type1, type2],
        [mockActions.getSavedObjectAction(type1, 'bulk_get')],
        {
          objects,
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.bulkGet when authorized`, async () => {
      const spaceId = 'space_1';
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = {
        bulkGet: jest.fn().mockReturnValue(returnValue)
      };
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => ({
          hasAllRequested: true,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type1, 'bulk_get')]: true,
            [mockActions.getSavedObjectAction(type2, 'bulk_get')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });
      const objects = [
        { type: type1, id: 'foo-id' },
        { type: type2, id: 'bar-id' },
      ];
      const options = Symbol();

      const result = await client.bulkGet(objects, options);

      expect(result).toBe(returnValue);
      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [
        mockActions.getSavedObjectAction(type1, 'bulk_get'),
        mockActions.getSavedObjectAction(type2, 'bulk_get'),
      ]);
      expect(mockBaseClient.bulkGet).toHaveBeenCalledWith(objects, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'bulk_get', [type1, type2], {
        objects,
        options,
      });
    });
  });

  describe('#get', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const spaceId = 'space_1';
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => {
          throw new Error('An actual error would happen here');
        })
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });

      await expect(client.get(type)).rejects.toThrowError(mockErrors.generalError);

      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [mockActions.getSavedObjectAction(type, 'get')]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const spaceId = 'space_1';
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => ({
          hasAllRequested: false,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'get')]: false,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });
      const id = Symbol();
      const options = Symbol();

      await expect(client.get(type, id, options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [mockActions.getSavedObjectAction(type, 'get')]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'get',
        [type],
        [mockActions.getSavedObjectAction(type, 'get')],
        {
          type,
          id,
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.get when authorized`, async () => {
      const spaceId = 'space_1';
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = {
        get: jest.fn().mockReturnValue(returnValue)
      };
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => ({
          hasAllRequested: true,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'get')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });
      const id = Symbol();
      const options = Symbol();

      const result = await client.get(type, id, options);

      expect(result).toBe(returnValue);
      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [mockActions.getSavedObjectAction(type, 'get')]);
      expect(mockBaseClient.get).toHaveBeenCalledWith(type, id, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'get', [type], {
        type,
        id,
        options
      });
    });
  });

  describe('#update', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const spaceId = 'space_1';
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => {
          throw new Error('An actual error would happen here');
        })
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });

      await expect(client.update(type)).rejects.toThrowError(mockErrors.generalError);

      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [mockActions.getSavedObjectAction(type, 'update')]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const spaceId = 'space_1';
      const type = 'foo';
      const username = Symbol();
      const mockActions = createMockActions();
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => ({
          hasAllRequested: false,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'update')]: false,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: null,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: mockErrors,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });
      const id = Symbol();
      const attributes = Symbol();
      const options = Symbol();

      await expect(client.update(type, id, attributes, options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [mockActions.getSavedObjectAction(type, 'update')]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'update',
        [type],
        [mockActions.getSavedObjectAction(type, 'update')],
        {
          type,
          id,
          attributes,
          options,
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.update when authorized`, async () => {
      const spaceId = 'space_1';
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockActions = createMockActions();
      const mockBaseClient = {
        update: jest.fn().mockReturnValue(returnValue)
      };
      const mockCheckPrivileges = {
        atSpace: jest.fn(async () => ({
          hasAllRequested: true,
          username,
          privileges: {
            [mockActions.getSavedObjectAction(type, 'update')]: true,
          }
        }))
      };
      const mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);
      const mockRequest = Symbol();
      const mockAuditLogger = createMockAuditLogger();
      const mockSpaces = {
        getSpaceId: jest.fn().mockReturnValue(spaceId)
      };
      const client = new SecureSavedObjectsClientWrapper({
        actions: mockActions,
        auditLogger: mockAuditLogger,
        baseClient: mockBaseClient,
        checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
        errors: null,
        request: mockRequest,
        savedObjectTypes: [],
        spaces: mockSpaces,
      });
      const id = Symbol();
      const attributes = Symbol();
      const options = Symbol();

      const result = await client.update(type, id, attributes, options);

      expect(result).toBe(returnValue);
      expect(mockSpaces.getSpaceId).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(mockRequest);
      expect(mockCheckPrivileges.atSpace).toHaveBeenCalledWith(spaceId, [mockActions.getSavedObjectAction(type, 'update')]);
      expect(mockBaseClient.update).toHaveBeenCalledWith(type, id, attributes, options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'update', [type], {
        type,
        id,
        attributes,
        options,
      });
    });
  });
});
