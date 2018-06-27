/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecureSavedObjectsClient } from './secure_saved_objects_client';

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
    const mockHasPrivileges = jest.fn().mockImplementation(async () => {
      throw new Error();
    });
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
    });

    await expect(client.create(type)).rejects.toThrowError(mockErrors.generalError);

    expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/create`]);
    expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`throws decorated ForbiddenError when user isn't authorized and no legacy fallback`, async () => {
    const type = 'foo';
    const username = Symbol();
    const useLegacyFallback = false;
    const mockErrors = createMockErrors();
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: false,
      missing: [
        `action:saved_objects/${type}/create`
      ],
      useLegacyFallback,
      username
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
    });
    const attributes = Symbol();
    const options = Symbol();

    await expect(client.create(type, attributes, options)).rejects.toThrowError(mockErrors.forbiddenError);

    expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/create`]);
    expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
      username,
      'create',
      [type],
      [`action:saved_objects/${type}/create`],
      useLegacyFallback,
      {
        type,
        attributes,
        options,
      }
    );
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`returns result of internalRepository.create when user is authorized`, async () => {
    const type = 'foo';
    const username = Symbol();
    const returnValue = Symbol();
    const mockRepository = {
      create: jest.fn().mockReturnValue(returnValue)
    };
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: true,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      internalRepository: mockRepository,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
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

  test(`returns result of callWithRequestRepository.create when user isn't authorized and has legacy fallback`, async () => {
    const type = 'foo';
    const username = Symbol();
    const returnValue = Symbol();
    const useLegacyFallback = true;
    const mockRepository = {
      create: jest.fn().mockReturnValue(returnValue)
    };
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: false,
      missing: [
        `action:saved_objects/${type}/create`
      ],
      username,
      useLegacyFallback,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      callWithRequestRepository: mockRepository,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
    });
    const attributes = Symbol();
    const options = Symbol();

    const result = await client.create(type, attributes, options);

    expect(result).toBe(returnValue);
    expect(mockRepository.create).toHaveBeenCalledWith(type, attributes, options);
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
      username,
      'create',
      [type],
      [`action:saved_objects/${type}/create`],
      useLegacyFallback,
      {
        type,
        attributes,
        options,
      }
    );
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });
});

describe('#bulkCreate', () => {
  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    const type = 'foo';
    const mockErrors = createMockErrors();
    const mockHasPrivileges = jest.fn().mockImplementation(async () => {
      throw new Error();
    });
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
    });

    await expect(client.bulkCreate([{ type }])).rejects.toThrowError(mockErrors.generalError);

    expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/bulk_create`]);
    expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`throws decorated ForbiddenError when user isn't authorized and no legacy fallback`, async () => {
    const type1 = 'foo';
    const type2 = 'bar';
    const username = Symbol();
    const useLegacyFallback = false;
    const mockErrors = createMockErrors();
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: false,
      missing: [
        `action:saved_objects/${type1}/bulk_create`
      ],
      useLegacyFallback,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
    });
    const objects = [
      { type: type1 },
      { type: type1 },
      { type: type2 },
    ];
    const options = Symbol();

    await expect(client.bulkCreate(objects, options)).rejects.toThrowError(mockErrors.forbiddenError);

    expect(mockHasPrivileges).toHaveBeenCalledWith([
      `action:saved_objects/${type1}/bulk_create`,
      `action:saved_objects/${type2}/bulk_create`
    ]);
    expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
      username,
      'bulk_create',
      [type2, type1],
      [`action:saved_objects/${type1}/bulk_create`],
      useLegacyFallback,
      {
        objects,
        options,
      }
    );
  });

  test(`returns result of internalRepository.bulkCreate when user is authorized`, async () => {
    const username = Symbol();
    const type1 = 'foo';
    const type2 = 'bar';
    const returnValue = Symbol();
    const mockRepository = {
      bulkCreate: jest.fn().mockReturnValue(returnValue)
    };
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: true,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      internalRepository: mockRepository,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
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

  test(`returns result of callWithRequestRepository.bulkCreate when user isn't authorized and has legacy fallback`, async () => {
    const username = Symbol();
    const useLegacyFallback = true;
    const type1 = 'foo';
    const type2 = 'bar';
    const returnValue = Symbol();
    const mockRepository = {
      bulkCreate: jest.fn().mockReturnValue(returnValue)
    };
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: false,
      missing: [
        `action:saved_objects/${type1}/bulk_create`,
        `action:saved_objects/${type2}/bulk_create`,
      ],
      useLegacyFallback,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      callWithRequestRepository: mockRepository,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
    });
    const objects = [
      { type: type1, otherThing: 'sup' },
      { type: type2, otherThing: 'everyone' },
    ];
    const options = Symbol();

    const result = await client.bulkCreate(objects, options);

    expect(result).toBe(returnValue);
    expect(mockRepository.bulkCreate).toHaveBeenCalledWith(objects, options);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
      username,
      'bulk_create',
      [type1, type2],
      [
        `action:saved_objects/${type1}/bulk_create`,
        `action:saved_objects/${type2}/bulk_create`,
      ],
      useLegacyFallback,
      {
        objects,
        options,
      }
    );
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });
});

describe('#delete', () => {
  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    const type = 'foo';
    const mockErrors = createMockErrors();
    const mockHasPrivileges = jest.fn().mockImplementation(async () => {
      throw new Error();
    });
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
    });

    await expect(client.delete(type)).rejects.toThrowError(mockErrors.generalError);

    expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/delete`]);
    expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`throws decorated ForbiddenError when user isn't authorized and no legacy fallback`, async () => {
    const type = 'foo';
    const username = Symbol();
    const useLegacyFallback = false;
    const mockErrors = createMockErrors();
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: false,
      missing: [
        `action:saved_objects/${type}/delete`
      ],
      useLegacyFallback,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
    });
    const id = Symbol();

    await expect(client.delete(type, id)).rejects.toThrowError(mockErrors.forbiddenError);

    expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/delete`]);
    expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
      username,
      'delete',
      [type],
      [`action:saved_objects/${type}/delete`],
      useLegacyFallback,
      {
        type,
        id,
      }
    );
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`returns result of internalRepository.delete when user is authorized`, async () => {
    const type = 'foo';
    const username = Symbol();
    const returnValue = Symbol();
    const mockRepository = {
      delete: jest.fn().mockReturnValue(returnValue)
    };
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: true,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      internalRepository: mockRepository,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
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

  test(`returns result of internalRepository.delete when user isn't authorized and and has legacy fallback`, async () => {
    const type = 'foo';
    const username = Symbol();
    const useLegacyFallback = true;
    const returnValue = Symbol();
    const mockRepository = {
      delete: jest.fn().mockReturnValue(returnValue)
    };
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: false,
      useLegacyFallback,
      missing: [
        `action:saved_objects/${type}/delete`
      ],
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      callWithRequestRepository: mockRepository,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
    });
    const id = Symbol();

    const result = await client.delete(type, id);

    expect(result).toBe(returnValue);
    expect(mockRepository.delete).toHaveBeenCalledWith(type, id);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
      username,
      'delete',
      [type],
      [`action:saved_objects/${type}/delete`],
      useLegacyFallback,
      {
        type,
        id,
      }
    );
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });
});

describe('#find', () => {
  describe('type', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const mockErrors = createMockErrors();
      const mockHasPrivileges = jest.fn().mockImplementation(async () => {
        throw new Error();
      });
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClient({
        errors: mockErrors,
        hasPrivileges: mockHasPrivileges,
        auditLogger: mockAuditLogger,
      });

      await expect(client.find({ type })).rejects.toThrowError(mockErrors.generalError);

      expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/find`]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when type's sinuglar and user isn't authorized and no legacy fallback`, async () => {
      const type = 'foo';
      const username = Symbol();
      const useLegacyFallback = false;
      const mockRepository = {};
      const mockErrors = createMockErrors();
      const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
        success: false,
        missing: [
          `action:saved_objects/${type}/find`
        ],
        useLegacyFallback,
        username,
      }));
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClient({
        errors: mockErrors,
        internalRepository: mockRepository,
        hasPrivileges: mockHasPrivileges,
        auditLogger: mockAuditLogger,
      });
      const options = { type };

      await expect(client.find(options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/find`]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'find',
        [type],
        [`action:saved_objects/${type}/find`],
        useLegacyFallback,
        {
          options
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when type's an array and user isn't authorized for one type and no legacy fallback`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const useLegacyFallback = false;
      const mockErrors = createMockErrors();
      const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
        success: false,
        missing: [
          `action:saved_objects/${type1}/find`
        ],
        useLegacyFallback,
        username,
      }));
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClient({
        errors: mockErrors,
        hasPrivileges: mockHasPrivileges,
        auditLogger: mockAuditLogger,
      });
      const options = { type: [ type1, type2 ] };

      await expect(client.find(options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type1}/find`, `action:saved_objects/${type2}/find`]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'find',
        [type2, type1],
        [`action:saved_objects/${type1}/find`],
        useLegacyFallback,
        {
          options
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when type's an array and user isn't authorized for any type and no legacy fallback`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const useLegacyFallback = false;
      const mockRepository = {};
      const mockErrors = createMockErrors();
      const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
        success: false,
        missing: [
          `action:saved_objects/${type1}/find`,
          `action:saved_objects/${type2}/find`
        ],
        useLegacyFallback,
        username,
      }));
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClient({
        errors: mockErrors,
        repository: mockRepository,
        hasPrivileges: mockHasPrivileges,
        auditLogger: mockAuditLogger,
      });
      const options = { type: [ type1, type2 ] };

      await expect(client.find(options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type1}/find`, `action:saved_objects/${type2}/find`]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'find',
        [type2, type1],
        [`action:saved_objects/${type2}/find`, `action:saved_objects/${type1}/find`],
        useLegacyFallback,
        {
          options
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of internalRepository.find when user is authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockRepository = {
        find: jest.fn().mockReturnValue(returnValue)
      };
      const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
        success: true,
        username,
      }));
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClient({
        internalRepository: mockRepository,
        hasPrivileges: mockHasPrivileges,
        auditLogger: mockAuditLogger,
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

    test(`returns result of callWithRequestRepository.find when user isn't authorized and has legacy fallback`, async () => {
      const type = 'foo';
      const username = Symbol();
      const useLegacyFallback = true;
      const returnValue = Symbol();
      const mockRepository = {
        find: jest.fn().mockReturnValue(returnValue)
      };
      const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
        success: false,
        missing: [
          `action:saved_objects/${type}/find`
        ],
        useLegacyFallback,
        username,
      }));
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClient({
        callWithRequestRepository: mockRepository,
        hasPrivileges: mockHasPrivileges,
        auditLogger: mockAuditLogger,
      });
      const options = { type };

      const result = await client.find(options);

      expect(result).toBe(returnValue);
      expect(mockRepository.find).toHaveBeenCalledWith({ type });
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'find',
        [type],
        [`action:saved_objects/${type}/find`],
        useLegacyFallback,
        {
          options
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });
  });

  describe('no type', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const mockRepository = {};
      const mockErrors = createMockErrors();
      const mockHasPrivileges = jest.fn().mockImplementation(async () => {
        throw new Error();
      });
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClient({
        errors: mockErrors,
        repository: mockRepository,
        hasPrivileges: mockHasPrivileges,
        auditLogger: mockAuditLogger,
        savedObjectTypes: [type1, type2]
      });

      await expect(client.find()).rejects.toThrowError(mockErrors.generalError);

      expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type1}/find`, `action:saved_objects/${type2}/find`]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when user isn't authorized and no legacy fallback`, async () => {
      const type = 'foo';
      const username = Symbol();
      const useLegacyFallback = false;
      const mockRepository = {};
      const mockErrors = createMockErrors();
      const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
        success: false,
        missing: [
          `action:saved_objects/${type}/find`
        ],
        useLegacyFallback,
        username,
      }));
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClient({
        errors: mockErrors,
        repository: mockRepository,
        hasPrivileges: mockHasPrivileges,
        auditLogger: mockAuditLogger,
        savedObjectTypes: [type]
      });
      const options = Symbol();

      await expect(client.find(options)).rejects.toThrowError(mockErrors.forbiddenError);

      expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/find`]);
      expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'find',
        [type],
        [`action:saved_objects/${type}/find`],
        useLegacyFallback,
        {
          options
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of callWithRequestRepository.find when user isn't authorized and has legacy fallback`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const useLegacyFallback = true;
      const mockRepository = {
        find: jest.fn().mockReturnValue(returnValue)
      };
      const mockErrors = createMockErrors();
      const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
        success: false,
        missing: [
          `action:saved_objects/${type}/find`
        ],
        useLegacyFallback,
        username,
      }));
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClient({
        errors: mockErrors,
        callWithRequestRepository: mockRepository,
        hasPrivileges: mockHasPrivileges,
        auditLogger: mockAuditLogger,
        savedObjectTypes: [type]
      });
      const options = Symbol();

      const result = await client.find(options);

      expect(result).toBe(returnValue);
      expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/find`]);
      expect(mockRepository.find).toHaveBeenCalledWith(options);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'find',
        [type],
        [`action:saved_objects/${type}/find`],
        useLegacyFallback,
        {
          options
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`specifies authorized types when calling repository.find()`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const mockRepository = {
        find: jest.fn(),
      };
      const mockErrors = createMockErrors();
      const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
        success: false,
        missing: [
          `action:saved_objects/${type1}/find`
        ]
      }));
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClient({
        errors: mockErrors,
        internalRepository: mockRepository,
        hasPrivileges: mockHasPrivileges,
        auditLogger: mockAuditLogger,
        savedObjectTypes: [type1, type2]
      });

      await client.find();

      expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type1}/find`, `action:saved_objects/${type2}/find`]);
      expect(mockRepository.find).toHaveBeenCalledWith(expect.objectContaining({
        type: [type2]
      }));
    });

    test(`returns result of repository.find`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockRepository = {
        find: jest.fn().mockReturnValue(returnValue)
      };
      const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
        success: true,
        missing: [],
        username,
      }));
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClient({
        internalRepository: mockRepository,
        hasPrivileges: mockHasPrivileges,
        auditLogger: mockAuditLogger,
        savedObjectTypes: [type]
      });
      const options = Symbol();

      const result = await client.find(options);

      expect(result).toBe(returnValue);
      expect(mockRepository.find).toHaveBeenCalledWith({ type: [type] });
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(username, 'find', [type], {
        options,
      });
    });
  });
});

describe('#bulkGet', () => {
  test(`throws decorated ForbiddenError when user isn't authorized and no legacy fallback`, async () => {
    const type1 = 'foo';
    const type2 = 'bar';
    const username = Symbol();
    const useLegacyFallback = false;
    const mockErrors = createMockErrors();
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: false,
      missing: [
        `action:saved_objects/${type1}/bulk_get`
      ],
      useLegacyFallback,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
    });
    const objects = [
      { type: type1 },
      { type: type1 },
      { type: type2 },
    ];

    await expect(client.bulkGet(objects)).rejects.toThrowError(mockErrors.forbiddenError);

    expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type1}/bulk_get`, `action:saved_objects/${type2}/bulk_get`]);
    expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
      username,
      'bulk_get',
      [type2, type1],
      [`action:saved_objects/${type1}/bulk_get`],
      useLegacyFallback,
      {
        objects
      }
    );
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    const type = 'foo';
    const mockErrors = createMockErrors();
    const mockHasPrivileges = jest.fn().mockImplementation(async () => {
      throw new Error();
    });
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
    });

    await expect(client.bulkGet([{ type }])).rejects.toThrowError(mockErrors.generalError);

    expect(mockHasPrivileges).toHaveBeenCalledWith(['action:saved_objects/foo/bulk_get']);
    expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`returns result of internalRepository.bulkGet when user is authorized`, async () => {
    const type1 = 'foo';
    const type2 = 'bar';
    const username = Symbol();
    const returnValue = Symbol();
    const mockRepository = {
      bulkGet: jest.fn().mockReturnValue(returnValue)
    };
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: true,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      internalRepository: mockRepository,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
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

  test(`returns result of callWithRequestRepository.bulkGet when user isn't authorized and has legacy fallback`, async () => {
    const type1 = 'foo';
    const type2 = 'bar';
    const username = Symbol();
    const useLegacyFallback = true;
    const returnValue = Symbol();
    const mockRepository = {
      bulkGet: jest.fn().mockReturnValue(returnValue)
    };
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: false,
      missing: [
        `action:saved_objects/${type1}/bulk_get`,
        `action:saved_objects/${type2}/bulk_get`
      ],
      useLegacyFallback,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      callWithRequestRepository: mockRepository,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
    });
    const objects = [
      { type: type1, id: 'foo-id' },
      { type: type2, id: 'bar-id' },
    ];

    const result = await client.bulkGet(objects);

    expect(result).toBe(returnValue);
    expect(mockRepository.bulkGet).toHaveBeenCalledWith(objects);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
      username,
      'bulk_get',
      [type1, type2],
      [`action:saved_objects/${type1}/bulk_get`, `action:saved_objects/${type2}/bulk_get`],
      useLegacyFallback,
      {
        objects
      }
    );
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });
});

describe('#get', () => {
  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    const type = 'foo';
    const mockErrors = createMockErrors();
    const mockHasPrivileges = jest.fn().mockImplementation(async () => {
      throw new Error();
    });
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
    });

    await expect(client.get(type)).rejects.toThrowError(mockErrors.generalError);

    expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/get`]);
    expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`throws decorated ForbiddenError when user isn't authorized and no legacy fallback`, async () => {
    const type = 'foo';
    const username = Symbol();
    const useLegacyFallback = false;
    const mockErrors = createMockErrors();
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: false,
      missing: [
        `action:saved_objects/${type}/get`
      ],
      useLegacyFallback,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
    });
    const id = Symbol();

    await expect(client.get(type, id)).rejects.toThrowError(mockErrors.forbiddenError);

    expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/get`]);
    expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
      username,
      'get',
      [type],
      [`action:saved_objects/${type}/get`],
      useLegacyFallback,
      {
        type,
        id,
      }
    );
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`returns result of internalRepository.get when user is authorized`, async () => {
    const type = 'foo';
    const username = Symbol();
    const returnValue = Symbol();
    const mockRepository = {
      get: jest.fn().mockReturnValue(returnValue)
    };
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: true,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      internalRepository: mockRepository,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
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
    const useLegacyFallback = true;
    const returnValue = Symbol();
    const mockRepository = {
      get: jest.fn().mockReturnValue(returnValue)
    };
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: false,
      missing: [
        `action:saved_objects/${type}/get`
      ],
      useLegacyFallback,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      callWithRequestRepository: mockRepository,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
    });
    const id = Symbol();

    const result = await client.get(type, id);

    expect(result).toBe(returnValue);
    expect(mockRepository.get).toHaveBeenCalledWith(type, id);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
      username,
      'get',
      [type],
      [`action:saved_objects/${type}/get`],
      useLegacyFallback,
      {
        type,
        id,
      }
    );
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });
});

describe('#update', () => {
  test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
    const type = 'foo';
    const mockErrors = createMockErrors();
    const mockHasPrivileges = jest.fn().mockImplementation(async () => {
      throw new Error();
    });
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
    });

    await expect(client.update(type)).rejects.toThrowError(mockErrors.generalError);

    expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/update`]);
    expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`throws decorated ForbiddenError when user isn't authorized and no legacy fallback`, async () => {
    const type = 'foo';
    const username = Symbol();
    const useLegacyFallback = false;
    const mockErrors = createMockErrors();
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: false,
      missing: [
        'action:saved_objects/foo/update'
      ],
      useLegacyFallback,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      errors: mockErrors,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
    });
    const id = Symbol();
    const attributes = Symbol();
    const options = Symbol();

    await expect(client.update(type, id, attributes, options)).rejects.toThrowError(mockErrors.forbiddenError);

    expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/update`]);
    expect(mockErrors.decorateForbiddenError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
      username,
      'update',
      [type],
      [`action:saved_objects/${type}/update`],
      useLegacyFallback,
      {
        type,
        id,
        attributes,
        options,
      }
    );
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`returns result of repository.update when user is authorized`, async () => {
    const type = 'foo';
    const username = Symbol();
    const returnValue = Symbol();
    const mockRepository = {
      update: jest.fn().mockReturnValue(returnValue)
    };
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: true,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      internalRepository: mockRepository,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
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

  test(`returns result of repository.update when user isn't authorized and has legacy fallback`, async () => {
    const type = 'foo';
    const username = Symbol();
    const useLegacyFallback = true;
    const returnValue = Symbol();
    const mockRepository = {
      update: jest.fn().mockReturnValue(returnValue)
    };
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: false,
      missing: [
        'action:saved_objects/foo/update'
      ],
      useLegacyFallback,
      username,
    }));
    const mockAuditLogger = createMockAuditLogger();
    const client = new SecureSavedObjectsClient({
      callWithRequestRepository: mockRepository,
      hasPrivileges: mockHasPrivileges,
      auditLogger: mockAuditLogger,
    });
    const id = Symbol();
    const attributes = Symbol();
    const options = Symbol();

    const result = await client.update(type, id, attributes, options);

    expect(result).toBe(returnValue);
    expect(mockRepository.update).toHaveBeenCalledWith(type, id, attributes, options);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
      username,
      'update',
      [type],
      [`action:saved_objects/${type}/update`],
      useLegacyFallback,
      {
        type,
        id,
        attributes,
        options,
      }
    );
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });
});
