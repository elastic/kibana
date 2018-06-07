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
  test(`throws decorated ForbiddenError when user doesn't have privileges`, async () => {
    const type = 'foo';
    const username = Symbol();
    const mockErrors = createMockErrors();
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: false,
      missing: [
        `action:saved_objects/${type}/create`
      ],
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
      {
        type,
        attributes,
        options,
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

    await expect(client.create(type)).rejects.toThrowError(mockErrors.generalError);

    expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/create`]);
    expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`calls and returns result of repository.create`, async () => {
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
      repository: mockRepository,
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
});

describe('#bulkCreate', () => {
  test(`throws decorated ForbiddenError when user doesn't have privileges`, async () => {
    const type1 = 'foo';
    const type2 = 'bar';
    const username = Symbol();
    const mockErrors = createMockErrors();
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: false,
      missing: [
        `action:saved_objects/${type1}/bulk_create`
      ],
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
      {
        objects,
        options,
      }
    );
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

    await expect(client.bulkCreate([{ type }])).rejects.toThrowError(mockErrors.generalError);

    expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/bulk_create`]);
    expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`calls and returns result of repository.bulkCreate`, async () => {
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
      repository: mockRepository,
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
});

describe('#delete', () => {
  test(`throws decorated ForbiddenError when user doesn't have privileges`, async () => {
    const type = 'foo';
    const username = Symbol();
    const mockErrors = createMockErrors();
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: false,
      missing: [
        `action:saved_objects/${type}/delete`
      ],
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
      {
        type,
        id,
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

    await expect(client.delete(type)).rejects.toThrowError(mockErrors.generalError);

    expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/delete`]);
    expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`calls and returns result of repository.delete`, async () => {
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
      repository: mockRepository,
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
});

describe('#find', () => {
  describe('type', () => {
    test(`throws decorated ForbiddenError when type is sinuglar and user isn't authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const mockRepository = {};
      const mockErrors = createMockErrors();
      const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
        success: false,
        missing: [
          `action:saved_objects/${type}/find`
        ],
        username,
      }));
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClient({
        errors: mockErrors,
        repository: mockRepository,
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
        {
          options
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when type is an array and user isn't authorized for one type`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const mockRepository = {};
      const mockErrors = createMockErrors();
      const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
        success: false,
        missing: [
          `action:saved_objects/${type1}/find`
        ],
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
        [`action:saved_objects/${type1}/find`],
        {
          options
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when type is an array and user isn't authorized for either type`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const mockRepository = {};
      const mockErrors = createMockErrors();
      const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
        success: false,
        missing: [
          `action:saved_objects/${type1}/find`,
          `action:saved_objects/${type2}/find`
        ],
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
        {
          options
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

      await expect(client.find({ type })).rejects.toThrowError(mockErrors.generalError);

      expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/find`]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`calls and returns result of repository.find`, async () => {
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
        repository: mockRepository,
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
  });

  describe('no type', () => {
    test(`throws decorated ForbiddenError when user has no authorized types`, async () => {
      const type = 'foo';
      const username = Symbol();
      const mockRepository = {
        getTypes: jest.fn().mockReturnValue([type])
      };
      const mockErrors = createMockErrors();
      const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
        success: false,
        missing: [
          `action:saved_objects/${type}/find`
        ],
        username,
      }));
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClient({
        errors: mockErrors,
        repository: mockRepository,
        hasPrivileges: mockHasPrivileges,
        auditLogger: mockAuditLogger,
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
        {
          options
        }
      );
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const mockRepository = {
        getTypes: jest.fn().mockReturnValue([type1, type2])
      };
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
      });

      await expect(client.find()).rejects.toThrowError(mockErrors.generalError);

      expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type1}/find`, `action:saved_objects/${type2}/find`]);
      expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`specifies authorized types when calling repository.find()`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const mockRepository = {
        getTypes: jest.fn().mockReturnValue([type1, type2]),
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
        repository: mockRepository,
        hasPrivileges: mockHasPrivileges,
        auditLogger: mockAuditLogger,
      });

      await client.find();

      expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type1}/find`, `action:saved_objects/${type2}/find`]);
      expect(mockRepository.find).toHaveBeenCalledWith(expect.objectContaining({
        type: [type2]
      }));
    });

    test(`calls and returns result of repository.find`, async () => {
      const type = 'foo';
      const username = Symbol();
      const returnValue = Symbol();
      const mockRepository = {
        getTypes: jest.fn().mockReturnValue([type]),
        find: jest.fn().mockReturnValue(returnValue)
      };
      const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
        success: true,
        missing: [],
        username,
      }));
      const mockAuditLogger = createMockAuditLogger();
      const client = new SecureSavedObjectsClient({
        repository: mockRepository,
        hasPrivileges: mockHasPrivileges,
        auditLogger: mockAuditLogger,
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
  test(`throws decorated ForbiddenError when user doesn't have privileges`, async () => {
    const type1 = 'foo';
    const type2 = 'bar';
    const username = Symbol();
    const mockErrors = createMockErrors();
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: false,
      missing: [
        `action:saved_objects/${type1}/bulk_get`
      ],
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

  test(`calls and returns result of repository.bulkGet`, async () => {
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
      repository: mockRepository,
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
});

describe('#get', () => {
  test(`throws decorated ForbiddenError when user doesn't have privileges`, async () => {
    const type = 'foo';
    const username = Symbol();
    const mockErrors = createMockErrors();
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: false,
      missing: [
        `action:saved_objects/${type}/get`
      ],
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
      {
        type,
        id,
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

    await expect(client.get(type)).rejects.toThrowError(mockErrors.generalError);

    expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/get`]);
    expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`calls and returns result of repository.get`, async () => {
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
      repository: mockRepository,
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
});

describe('#update', () => {
  test(`throws decorated ForbiddenError when user doesn't have privileges`, async () => {
    const type = 'foo';
    const username = Symbol();
    const mockErrors = createMockErrors();
    const mockHasPrivileges = jest.fn().mockImplementation(async () => ({
      success: false,
      missing: [
        'action:saved_objects/foo/update'
      ],
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
      {
        type,
        id,
        attributes,
        options,
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

    await expect(client.update(type)).rejects.toThrowError(mockErrors.generalError);

    expect(mockHasPrivileges).toHaveBeenCalledWith([`action:saved_objects/${type}/update`]);
    expect(mockErrors.decorateGeneralError).toHaveBeenCalledTimes(1);
    expect(mockAuditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
    expect(mockAuditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
  });

  test(`calls and returns result of repository.update`, async () => {
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
      repository: mockRepository,
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
});
