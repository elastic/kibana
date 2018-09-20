/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecureSavedObjectsClient } from './secure_saved_objects_client';
import { CHECK_PRIVILEGES_RESULT } from '../authorization/check_privileges';

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

    const client = new SecureSavedObjectsClient({ errors });

    expect(client.errors).toBe(errors);
  });
});

describe('#create', () => {
  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    const type = 'foo';
    const mockErrors = createMockErrors();
    const mockCheckPrivileges = jest.fn().mockImplementation(async () => {
      throw new Error();
    });
    const mockAuditLogger = createMockAuditLogger();
    const mockActions = createMockActions();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: mockActions,
    });

    await expect(client.create(type)).rejects.toThrowError(mockErrors.generalError);

    expect(mockCheckPrivileges).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'create')]);
    expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const type = 'foo';
    const username = Symbol();
    const mockErrors = createMockErrors();
    const mockCheckPrivileges = jest.fn().mockImplementation(async privileges => ({
      result: CHECK_PRIVILEGES_RESULT.UNAUTHORIZED,
      username,
      missing: privileges,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const mockActions = createMockActions();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: mockActions,
    });
    const attributes = Symbol();
    const options = Symbol();

    await expect(client.create(type, attributes, options)).rejects.toThrowError(mockErrors.forbiddenError);

    expect(mockCheckPrivileges).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'create')]);
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

  test(`returns result of internalRepository.create when authorized`, async () => {
    const type = 'foo';
    const username = Symbol();
    const returnValue = Symbol();
    const mockRepository = {
      create: jest.fn().mockReturnValue(returnValue)
    };
    const mockCheckPrivileges = jest.fn().mockImplementation(async () => ({
      result: CHECK_PRIVILEGES_RESULT.AUTHORIZED,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      internalRepository: mockRepository,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: createMockActions(),
    });
    const attributes = Symbol();
    const options = Symbol();

    const result = await client.create(type, attributes, options);

    expect(result).toBe(returnValue);
    expect(mockRepository.create).toHaveBeenCalledWith(type, attributes, options);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'create', [type], {
      type,
      attributes,
      options,
    });
  });

  test(`returns result of callWithRequestRepository.create when legacy`, async () => {
    const type = 'foo';
    const username = Symbol();
    const returnValue = Symbol();
    const mockRepository = {
      create: jest.fn().mockReturnValue(returnValue)
    };
    const mockCheckPrivileges = jest.fn().mockImplementation(async privileges => ({
      result: CHECK_PRIVILEGES_RESULT.LEGACY,
      username,
      missing: privileges,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      callWithRequestRepository: mockRepository,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: createMockActions(),
    });
    const attributes = Symbol();
    const options = Symbol();

    const result = await client.create(type, attributes, options);

    expect(result).toBe(returnValue);
    expect(mockRepository.create).toHaveBeenCalledWith(type, attributes, options);
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
  });
});

describe('#bulkCreate', () => {
  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    const type = 'foo';
    const mockErrors = createMockErrors();
    const mockCheckPrivileges = jest.fn().mockImplementation(async () => {
      throw new Error();
    });
    const mockAuditLogger = createMockAuditLogger();
    const mockActions = createMockActions();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: mockActions,
    });

    await expect(client.bulkCreate([{ type }])).rejects.toThrowError(mockErrors.generalError);

    expect(mockCheckPrivileges).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'bulk_create')]);
    expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const type1 = 'foo';
    const type2 = 'bar';
    const username = Symbol();
    const mockErrors = createMockErrors();
    const mockCheckPrivileges = jest.fn().mockImplementation(async privileges => ({
      result: CHECK_PRIVILEGES_RESULT.UNAUTHORIZED,
      username,
      missing: [
        privileges[0]
      ],
    }));
    const mockAuditLogger = createMockAuditLogger();
    const mockActions = createMockActions();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: mockActions,
    });
    const objects = [
      { type: type1 },
      { type: type1 },
      { type: type2 },
    ];
    const options = Symbol();

    await expect(client.bulkCreate(objects, options)).rejects.toThrowError(mockErrors.forbiddenError);

    expect(mockCheckPrivileges).toHaveBeenCalledWith([
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

  test(`returns result of internalRepository.bulkCreate when authorized`, async () => {
    const username = Symbol();
    const type1 = 'foo';
    const type2 = 'bar';
    const returnValue = Symbol();
    const mockRepository = {
      bulkCreate: jest.fn().mockReturnValue(returnValue)
    };
    const mockCheckPrivileges = jest.fn().mockImplementation(async () => ({
      result: CHECK_PRIVILEGES_RESULT.AUTHORIZED,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      internalRepository: mockRepository,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: createMockActions(),
    });
    const objects = [
      { type: type1, otherThing: 'sup' },
      { type: type2, otherThing: 'everyone' },
    ];
    const options = Symbol();

    const result = await client.bulkCreate(objects, options);

    expect(result).toBe(returnValue);
    expect(mockRepository.bulkCreate).toHaveBeenCalledWith(objects, options);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'bulk_create', [type1, type2], {
      objects,
      options,
    });
  });

  test(`returns result of callWithRequestRepository.bulkCreate when legacy`, async () => {
    const username = Symbol();
    const type1 = 'foo';
    const type2 = 'bar';
    const returnValue = Symbol();
    const mockRepository = {
      bulkCreate: jest.fn().mockReturnValue(returnValue)
    };
    const mockCheckPrivileges = jest.fn().mockImplementation(async privileges => ({
      result: CHECK_PRIVILEGES_RESULT.LEGACY,
      username,
      missing: privileges,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      callWithRequestRepository: mockRepository,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: createMockActions(),
    });
    const objects = [
      { type: type1, otherThing: 'sup' },
      { type: type2, otherThing: 'everyone' },
    ];
    const options = Symbol();

    const result = await client.bulkCreate(objects, options);

    expect(result).toBe(returnValue);
    expect(mockRepository.bulkCreate).toHaveBeenCalledWith(objects, options);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });
});

describe('#delete', () => {
  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    const type = 'foo';
    const mockErrors = createMockErrors();
    const mockCheckPrivileges = jest.fn().mockImplementation(async () => {
      throw new Error();
    });
    const mockAuditLogger = createMockAuditLogger();
    const mockActions = createMockActions();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: mockActions,
    });

    await expect(client.delete(type)).rejects.toThrowError(mockErrors.generalError);

    expect(mockCheckPrivileges).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'delete')]);
    expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const type = 'foo';
    const username = Symbol();
    const mockErrors = createMockErrors();
    const mockCheckPrivileges = jest.fn().mockImplementation(async privileges => ({
      result: CHECK_PRIVILEGES_RESULT.UNAUTHORIZED,
      username,
      missing: privileges,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const mockActions = createMockActions();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: mockActions,
    });
    const id = Symbol();

    await expect(client.delete(type, id)).rejects.toThrowError(mockErrors.forbiddenError);

    expect(mockCheckPrivileges).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'delete')]);
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
    const mockRepository = {
      delete: jest.fn().mockReturnValue(returnValue)
    };
    const mockCheckPrivileges = jest.fn().mockImplementation(async () => ({
      result: CHECK_PRIVILEGES_RESULT.AUTHORIZED,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      internalRepository: mockRepository,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: createMockActions(),
    });
    const id = Symbol();

    const result = await client.delete(type, id);

    expect(result).toBe(returnValue);
    expect(mockRepository.delete).toHaveBeenCalledWith(type, id);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'delete', [type], {
      type,
      id,
    });
  });

  test(`returns result of internalRepository.delete when legacy`, async () => {
    const type = 'foo';
    const username = Symbol();
    const returnValue = Symbol();
    const mockRepository = {
      delete: jest.fn().mockReturnValue(returnValue)
    };
    const mockCheckPrivileges = jest.fn().mockImplementation(async privileges => ({
      result: CHECK_PRIVILEGES_RESULT.LEGACY,
      username,
      missing: privileges,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      callWithRequestRepository: mockRepository,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: createMockActions(),
    });
    const id = Symbol();

    const result = await client.delete(type, id);

    expect(result).toBe(returnValue);
    expect(mockRepository.delete).toHaveBeenCalledWith(type, id);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });
});

describe('#find', () => {
  describe('type', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = jest.fn().mockImplementation(async () => {
        throw new Error();
      });
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const client = new SecureSavedObjectsClient({
        errors: mockErrors,
        checkPrivileges: mockCheckPrivileges,
        auditLogger: mockAuditLogger,
        actions: mockActions,
      });

      await expect(client.find({ type })).rejects.toThrowError(mockErrors.generalError);

      expect(mockCheckPrivileges).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'find')]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when type's singular and unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const mockRepository = {};
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = jest.fn().mockImplementation(async privileges => ({
        result: CHECK_PRIVILEGES_RESULT.UNAUTHORIZED,
        username,
        missing: privileges,
      }));
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const client = new SecureSavedObjectsClient({
        errors: mockErrors,
        internalRepository: mockRepository,
        checkPrivileges: mockCheckPrivileges,
        auditLogger: mockAuditLogger,
        actions: mockActions,
      });
      const options = { type };

      await expect(client.find(options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockCheckPrivileges).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'find')]);
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
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = jest.fn().mockImplementation(async privileges => {
        return {
          result: CHECK_PRIVILEGES_RESULT.UNAUTHORIZED,
          username,
          missing: [
            privileges[0]
          ],
        };
      });
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const client = new SecureSavedObjectsClient({
        errors: mockErrors,
        checkPrivileges: mockCheckPrivileges,
        auditLogger: mockAuditLogger,
        actions: mockActions,
      });
      const options = { type: [type1, type2] };

      await expect(client.find(options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockCheckPrivileges).toHaveBeenCalledWith([
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

    test(`returns result of internalRepository.find when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockRepository = {
        find: jest.fn().mockReturnValue(returnValue)
      };
      const mockCheckPrivileges = jest.fn().mockImplementation(async () => ({
        result: CHECK_PRIVILEGES_RESULT.AUTHORIZED,
        username,
      }));
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClient({
        internalRepository: mockRepository,
        checkPrivileges: mockCheckPrivileges,
        auditLogger: mockAuditLogger,
        actions: createMockActions(),
      });
      const options = { type };

      const result = await client.find(options);

      expect(result).toBe(returnValue);
      expect(mockRepository.find).toHaveBeenCalledWith({ type });
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'find', [type], {
        options,
      });
    });

    test(`returns result of callWithRequestRepository.find when legacy`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockRepository = {
        find: jest.fn().mockReturnValue(returnValue)
      };
      const mockCheckPrivileges = jest.fn().mockImplementation(async privileges => ({
        result: CHECK_PRIVILEGES_RESULT.LEGACY,
        username,
        missing: privileges,
      }));
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClient({
        callWithRequestRepository: mockRepository,
        checkPrivileges: mockCheckPrivileges,
        auditLogger: mockAuditLogger,
        actions: createMockActions(),
      });
      const options = { type };

      const result = await client.find(options);

      expect(result).toBe(returnValue);
      expect(mockRepository.find).toHaveBeenCalledWith({ type });
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });
  });

  describe('no type', () => {
    test(`throws error`, async () => {
      const mockRepository = {};
      const mockErrors = createMockErrors();
      const mockCheckPrivileges = jest.fn().mockImplementation(async () => {
        throw new Error();
      });
      const mockAuditLogger = createMockAuditLogger();
      const mockActions = createMockActions();
      const client = new SecureSavedObjectsClient({
        errors: mockErrors,
        repository: mockRepository,
        checkPrivileges: mockCheckPrivileges,
        auditLogger: mockAuditLogger,
        actions: mockActions,
      });

      await expect(client.find()).rejects.toThrowError(mockErrors.generalError);

      expect(mockCheckPrivileges).toHaveBeenCalledWith([
        mockActions.getSavedObjectAction(undefined, 'find'),
      ]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });
  });
});

describe('#bulkGet', () => {
  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    const type = 'foo';
    const mockErrors = createMockErrors();
    const mockCheckPrivileges = jest.fn().mockImplementation(async () => {
      throw new Error();
    });
    const mockAuditLogger = createMockAuditLogger();
    const mockActions = createMockActions();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: mockActions,
    });

    await expect(client.bulkGet([{ type }])).rejects.toThrowError(mockErrors.generalError);

    expect(mockCheckPrivileges).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'bulk_get')]);
    expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const type1 = 'foo';
    const type2 = 'bar';
    const username = Symbol();
    const mockErrors = createMockErrors();
    const mockCheckPrivileges = jest.fn().mockImplementation(async privileges => ({
      result: CHECK_PRIVILEGES_RESULT.UNAUTHORIZED,
      username,
      missing: [
        privileges[0]
      ],
    }));
    const mockAuditLogger = createMockAuditLogger();
    const mockActions = createMockActions();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: mockActions,
    });
    const objects = [
      { type: type1 },
      { type: type1 },
      { type: type2 },
    ];

    await expect(client.bulkGet(objects)).rejects.toThrowError(mockErrors.forbiddenError);

    expect(mockCheckPrivileges).toHaveBeenCalledWith([
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
        objects
      }
    );
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`returns result of internalRepository.bulkGet when authorized`, async () => {
    const type1 = 'foo';
    const type2 = 'bar';
    const username = Symbol();
    const returnValue = Symbol();
    const mockRepository = {
      bulkGet: jest.fn().mockReturnValue(returnValue)
    };
    const mockCheckPrivileges = jest.fn().mockImplementation(async () => ({
      result: CHECK_PRIVILEGES_RESULT.AUTHORIZED,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      internalRepository: mockRepository,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: createMockActions(),
    });
    const objects = [
      { type: type1, id: 'foo-id' },
      { type: type2, id: 'bar-id' },
    ];

    const result = await client.bulkGet(objects);

    expect(result).toBe(returnValue);
    expect(mockRepository.bulkGet).toHaveBeenCalledWith(objects);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'bulk_get', [type1, type2], {
      objects,
    });
  });

  test(`returns result of callWithRequestRepository.bulkGet when legacy`, async () => {
    const type1 = 'foo';
    const type2 = 'bar';
    const username = Symbol();
    const returnValue = Symbol();
    const mockRepository = {
      bulkGet: jest.fn().mockReturnValue(returnValue)
    };
    const mockCheckPrivileges = jest.fn().mockImplementation(async privileges => ({
      result: CHECK_PRIVILEGES_RESULT.LEGACY,
      username,
      missing: privileges,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      callWithRequestRepository: mockRepository,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: createMockActions(),
    });
    const objects = [
      { type: type1, id: 'foo-id' },
      { type: type2, id: 'bar-id' },
    ];

    const result = await client.bulkGet(objects);

    expect(result).toBe(returnValue);
    expect(mockRepository.bulkGet).toHaveBeenCalledWith(objects);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });
});

describe('#get', () => {
  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    const type = 'foo';
    const mockErrors = createMockErrors();
    const mockCheckPrivileges = jest.fn().mockImplementation(async () => {
      throw new Error();
    });
    const mockAuditLogger = createMockAuditLogger();
    const mockActions = createMockActions();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: mockActions,
    });

    await expect(client.get(type)).rejects.toThrowError(mockErrors.generalError);

    expect(mockCheckPrivileges).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'get')]);
    expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const type = 'foo';
    const username = Symbol();
    const mockErrors = createMockErrors();
    const mockCheckPrivileges = jest.fn().mockImplementation(async privileges => ({
      result: CHECK_PRIVILEGES_RESULT.UNAUTHORIZED,
      username,
      missing: privileges,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const mockActions = createMockActions();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: mockActions,
    });
    const id = Symbol();

    await expect(client.get(type, id)).rejects.toThrowError(mockErrors.forbiddenError);

    expect(mockCheckPrivileges).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'get')]);
    expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
      username,
      'get',
      [type],
      [mockActions.getSavedObjectAction(type, 'get')],
      {
        type,
        id,
      }
    );
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`returns result of internalRepository.get when authorized`, async () => {
    const type = 'foo';
    const username = Symbol();
    const returnValue = Symbol();
    const mockRepository = {
      get: jest.fn().mockReturnValue(returnValue)
    };
    const mockCheckPrivileges = jest.fn().mockImplementation(async () => ({
      result: CHECK_PRIVILEGES_RESULT.AUTHORIZED,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      internalRepository: mockRepository,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: createMockActions(),
    });
    const id = Symbol();

    const result = await client.get(type, id);

    expect(result).toBe(returnValue);
    expect(mockRepository.get).toHaveBeenCalledWith(type, id);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'get', [type], {
      type,
      id,
    });
  });

  test(`returns result of callWithRequestRepository.get when user isn't authorized and has legacy fallback`, async () => {
    const type = 'foo';
    const username = Symbol();
    const returnValue = Symbol();
    const mockRepository = {
      get: jest.fn().mockReturnValue(returnValue)
    };
    const mockCheckPrivileges = jest.fn().mockImplementation(async privileges => ({
      result: CHECK_PRIVILEGES_RESULT.LEGACY,
      username,
      missing: privileges,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      callWithRequestRepository: mockRepository,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: createMockActions(),
    });
    const id = Symbol();

    const result = await client.get(type, id);

    expect(result).toBe(returnValue);
    expect(mockRepository.get).toHaveBeenCalledWith(type, id);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });
});

describe('#update', () => {
  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    const type = 'foo';
    const mockErrors = createMockErrors();
    const mockCheckPrivileges = jest.fn().mockImplementation(async () => {
      throw new Error();
    });
    const mockAuditLogger = createMockAuditLogger();
    const mockActions = createMockActions();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: mockActions,
    });

    await expect(client.update(type)).rejects.toThrowError(mockErrors.generalError);

    expect(mockCheckPrivileges).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'update')]);
    expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`throws decorated ForbiddenError when unauthorized`, async () => {
    const type = 'foo';
    const username = Symbol();
    const mockErrors = createMockErrors();
    const mockCheckPrivileges = jest.fn().mockImplementation(async privileges => ({
      result: CHECK_PRIVILEGES_RESULT.UNAUTHORIZED,
      username,
      missing: privileges,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const mockActions = createMockActions();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: mockActions,
    });
    const id = Symbol();
    const attributes = Symbol();
    const options = Symbol();

    await expect(client.update(type, id, attributes, options)).rejects.toThrowError(mockErrors.forbiddenError);

    expect(mockCheckPrivileges).toHaveBeenCalledWith([mockActions.getSavedObjectAction(type, 'update')]);
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

  test(`returns result of repository.update when authorized`, async () => {
    const type = 'foo';
    const username = Symbol();
    const returnValue = Symbol();
    const mockRepository = {
      update: jest.fn().mockReturnValue(returnValue)
    };
    const mockCheckPrivileges = jest.fn().mockImplementation(async () => ({
      result: CHECK_PRIVILEGES_RESULT.AUTHORIZED,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      internalRepository: mockRepository,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: createMockActions(),
    });
    const id = Symbol();
    const attributes = Symbol();
    const options = Symbol();

    const result = await client.update(type, id, attributes, options);

    expect(result).toBe(returnValue);
    expect(mockRepository.update).toHaveBeenCalledWith(type, id, attributes, options);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'update', [type], {
      type,
      id,
      attributes,
      options,
    });
  });

  test(`returns result of repository.update when legacy`, async () => {
    const type = 'foo';
    const username = Symbol();
    const returnValue = Symbol();
    const mockRepository = {
      update: jest.fn().mockReturnValue(returnValue)
    };
    const mockCheckPrivileges = jest.fn().mockImplementation(async privileges => ({
      result: CHECK_PRIVILEGES_RESULT.LEGACY,
      username,
      missing: privileges,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      callWithRequestRepository: mockRepository,
      checkPrivileges: mockCheckPrivileges,
      auditLogger: mockAuditLogger,
      actions: createMockActions(),
    });
    const id = Symbol();
    const attributes = Symbol();
    const options = Symbol();

    const result = await client.update(type, id, attributes, options);

    expect(result).toBe(returnValue);
    expect(mockRepository.update).toHaveBeenCalledWith(type, id, attributes, options);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });
});
