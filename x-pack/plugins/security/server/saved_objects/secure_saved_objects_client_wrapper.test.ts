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
  } as unknown) as jest.Mocked<SavedObjectsClientContract['errors']>;

  return {
    actions,
    baseClient: savedObjectsClientMock.create(),
    checkSavedObjectsPrivilegesAsCurrentUser: jest.fn(),
    errors,
    auditLogger: securityAuditLoggerMock.create(),
    forbiddenError,
    generalError,
  };
};

describe('#errors', () => {
  test(`assigns errors from constructor to .errors`, () => {
    const options = createSecureSavedObjectsClientWrapperOptions();
    const client = new SecureSavedObjectsClientWrapper(options);

    expect(client.errors).toBe(options.errors);
  });
});

describe(`spaces disabled`, () => {
  describe('#create', () => {
    test(`throws decorated GeneralError when checkPrivileges.globally rejects promise`, async () => {
      const type = 'foo';
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(
        new Error('An actual error would happen here')
      );
      const client = new SecureSavedObjectsClientWrapper(options);

      await expect(client.create(type)).rejects.toThrowError(options.generalError);
      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'create')],
        undefined
      );
      expect(options.errors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
        hasAllRequested: false,
        username,
        privileges: { [options.actions.savedObject.get(type, 'create')]: false },
      });

      const client = new SecureSavedObjectsClientWrapper(options);

      const attributes = { some_attr: 's' };
      const apiCallOptions = Object.freeze({ namespace: 'some-ns' });
      await expect(client.create(type, attributes, apiCallOptions)).rejects.toThrowError(
        options.forbiddenError
      );

      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'create')],
        apiCallOptions.namespace
      );
      expect(options.errors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'create',
        [type],
        [options.actions.savedObject.get(type, 'create')],
        { type, attributes, options: apiCallOptions }
      );
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.create when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
        hasAllRequested: true,
        username,
        privileges: { [options.actions.savedObject.get(type, 'create')]: true },
      });

      const apiCallReturnValue = Symbol();
      options.baseClient.create.mockReturnValue(apiCallReturnValue as any);

      const client = new SecureSavedObjectsClientWrapper(options);

      const attributes = { some_attr: 's' };
      const apiCallOptions = Object.freeze({ namespace: 'some-ns' });
      await expect(client.create(type, attributes, apiCallOptions)).resolves.toBe(
        apiCallReturnValue
      );

      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'create')],
        apiCallOptions.namespace
      );
      expect(options.baseClient.create).toHaveBeenCalledWith(type, attributes, apiCallOptions);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'create',
        [type],
        { type, attributes, options: apiCallOptions }
      );
    });
  });

  describe('#bulkCreate', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(
        new Error('An actual error would happen here')
      );
      const client = new SecureSavedObjectsClientWrapper(options);

      const apiCallOptions = Object.freeze({ namespace: 'some-ns' });
      await expect(
        client.bulkCreate([{ type, attributes: {} }], apiCallOptions)
      ).rejects.toThrowError(options.generalError);
      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'bulk_create')],
        apiCallOptions.namespace
      );
      expect(options.errors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
        hasAllRequested: false,
        username,
        privileges: {
          [options.actions.savedObject.get(type1, 'bulk_create')]: false,
          [options.actions.savedObject.get(type2, 'bulk_create')]: true,
        },
      });

      const client = new SecureSavedObjectsClientWrapper(options);

      const objects = [
        { type: type1, attributes: {} },
        { type: type2, attributes: {} },
      ];
      const apiCallOptions = Object.freeze({ namespace: 'some-ns' });
      await expect(client.bulkCreate(objects, apiCallOptions)).rejects.toThrowError(
        options.forbiddenError
      );

      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [
          options.actions.savedObject.get(type1, 'bulk_create'),
          options.actions.savedObject.get(type2, 'bulk_create'),
        ],
        apiCallOptions.namespace
      );
      expect(options.errors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'bulk_create',
        [type1, type2],
        [options.actions.savedObject.get(type1, 'bulk_create')],
        { objects, options: apiCallOptions }
      );
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.bulkCreate when authorized`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
        hasAllRequested: true,
        username,
        privileges: {
          [options.actions.savedObject.get(type1, 'bulk_create')]: true,
          [options.actions.savedObject.get(type2, 'bulk_create')]: true,
        },
      });

      const apiCallReturnValue = Symbol();
      options.baseClient.bulkCreate.mockReturnValue(apiCallReturnValue as any);

      const client = new SecureSavedObjectsClientWrapper(options);

      const objects = [
        { type: type1, otherThing: 'sup', attributes: {} },
        { type: type2, otherThing: 'everyone', attributes: {} },
      ];
      const apiCallOptions = Object.freeze({ namespace: 'some-ns' });
      await expect(client.bulkCreate(objects, apiCallOptions)).resolves.toBe(apiCallReturnValue);

      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [
          options.actions.savedObject.get(type1, 'bulk_create'),
          options.actions.savedObject.get(type2, 'bulk_create'),
        ],
        apiCallOptions.namespace
      );
      expect(options.baseClient.bulkCreate).toHaveBeenCalledWith(objects, apiCallOptions);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'bulk_create',
        [type1, type2],
        { objects, options: apiCallOptions }
      );
    });
  });

  describe('#delete', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(
        new Error('An actual error would happen here')
      );
      const client = new SecureSavedObjectsClientWrapper(options);

      await expect(client.delete(type, 'bar')).rejects.toThrowError(options.generalError);
      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'delete')],
        undefined
      );
      expect(options.errors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type = 'foo';
      const id = 'bar';
      const username = Symbol();
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
        hasAllRequested: false,
        username,
        privileges: {
          [options.actions.savedObject.get(type, 'delete')]: false,
        },
      });

      const client = new SecureSavedObjectsClientWrapper(options);

      const apiCallOptions = Object.freeze({ namespace: 'some-ns' });
      await expect(client.delete(type, id, apiCallOptions)).rejects.toThrowError(
        options.forbiddenError
      );

      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'delete')],
        apiCallOptions.namespace
      );
      expect(options.errors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'delete',
        [type],
        [options.actions.savedObject.get(type, 'delete')],
        { type, id, options: apiCallOptions }
      );
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of internalRepository.delete when authorized`, async () => {
      const type = 'foo';
      const id = 'bar';
      const username = Symbol();
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
        hasAllRequested: true,
        username,
        privileges: { [options.actions.savedObject.get(type, 'delete')]: true },
      });

      const apiCallReturnValue = Symbol();
      options.baseClient.delete.mockReturnValue(apiCallReturnValue as any);

      const client = new SecureSavedObjectsClientWrapper(options);

      const apiCallOptions = Object.freeze({ namespace: 'some-ns' });
      await expect(client.delete(type, id, apiCallOptions)).resolves.toBe(apiCallReturnValue);

      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'delete')],
        apiCallOptions.namespace
      );
      expect(options.baseClient.delete).toHaveBeenCalledWith(type, id, apiCallOptions);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'delete',
        [type],
        { type, id, options: apiCallOptions }
      );
    });
  });

  describe('#find', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(
        new Error('An actual error would happen here')
      );
      const client = new SecureSavedObjectsClientWrapper(options);

      await expect(client.find({ type })).rejects.toThrowError(options.generalError);
      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'find')],
        undefined
      );
      expect(options.errors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when type's singular and unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
        hasAllRequested: false,
        username,
        privileges: { [options.actions.savedObject.get(type, 'find')]: false },
      });

      const client = new SecureSavedObjectsClientWrapper(options);

      const apiCallOptions = Object.freeze({ type, namespace: 'some-ns' });
      await expect(client.find(apiCallOptions)).rejects.toThrowError(options.forbiddenError);

      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'find')],
        apiCallOptions.namespace
      );
      expect(options.errors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'find',
        [type],
        [options.actions.savedObject.get(type, 'find')],
        { options: apiCallOptions }
      );
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when type's an array and unauthorized`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
        hasAllRequested: false,
        username,
        privileges: {
          [options.actions.savedObject.get(type1, 'find')]: false,
          [options.actions.savedObject.get(type2, 'find')]: true,
        },
      });

      const client = new SecureSavedObjectsClientWrapper(options);

      const apiCallOptions = Object.freeze({ type: [type1, type2], namespace: 'some-ns' });
      await expect(client.find(apiCallOptions)).rejects.toThrowError(options.forbiddenError);

      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [
          options.actions.savedObject.get(type1, 'find'),
          options.actions.savedObject.get(type2, 'find'),
        ],
        apiCallOptions.namespace
      );
      expect(options.errors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'find',
        [type1, type2],
        [options.actions.savedObject.get(type1, 'find')],
        { options: apiCallOptions }
      );
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.find when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
        hasAllRequested: true,
        username,
        privileges: { [options.actions.savedObject.get(type, 'find')]: true },
      });

      const apiCallReturnValue = Symbol();
      options.baseClient.find.mockReturnValue(apiCallReturnValue as any);

      const client = new SecureSavedObjectsClientWrapper(options);

      const apiCallOptions = Object.freeze({ type, namespace: 'some-ns' });
      await expect(client.find(apiCallOptions)).resolves.toBe(apiCallReturnValue);

      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'find')],
        apiCallOptions.namespace
      );
      expect(options.baseClient.find).toHaveBeenCalledWith(apiCallOptions);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'find',
        [type],
        { options: apiCallOptions }
      );
    });
  });

  describe('#bulkGet', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(
        new Error('An actual error would happen here')
      );
      const client = new SecureSavedObjectsClientWrapper(options);

      await expect(client.bulkGet([{ id: 'bar', type }])).rejects.toThrowError(
        options.generalError
      );
      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'bulk_get')],
        undefined
      );
      expect(options.errors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
        hasAllRequested: false,
        username,
        privileges: {
          [options.actions.savedObject.get(type1, 'bulk_get')]: false,
          [options.actions.savedObject.get(type2, 'bulk_get')]: true,
        },
      });

      const client = new SecureSavedObjectsClientWrapper(options);

      const objects = [
        { type: type1, id: `bar-${type1}` },
        { type: type2, id: `bar-${type2}` },
      ];
      const apiCallOptions = Object.freeze({ namespace: 'some-ns' });
      await expect(client.bulkGet(objects, apiCallOptions)).rejects.toThrowError(
        options.forbiddenError
      );

      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [
          options.actions.savedObject.get(type1, 'bulk_get'),
          options.actions.savedObject.get(type2, 'bulk_get'),
        ],
        apiCallOptions.namespace
      );
      expect(options.errors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'bulk_get',
        [type1, type2],
        [options.actions.savedObject.get(type1, 'bulk_get')],
        { objects, options: apiCallOptions }
      );
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.bulkGet when authorized`, async () => {
      const type1 = 'foo';
      const type2 = 'bar';
      const username = Symbol();
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
        hasAllRequested: true,
        username,
        privileges: {
          [options.actions.savedObject.get(type1, 'bulk_get')]: true,
          [options.actions.savedObject.get(type2, 'bulk_get')]: true,
        },
      });

      const apiCallReturnValue = Symbol();
      options.baseClient.bulkGet.mockReturnValue(apiCallReturnValue as any);

      const client = new SecureSavedObjectsClientWrapper(options);

      const objects = [
        { type: type1, id: `id-${type1}` },
        { type: type2, id: `id-${type2}` },
      ];
      const apiCallOptions = Object.freeze({ namespace: 'some-ns' });
      await expect(client.bulkGet(objects, apiCallOptions)).resolves.toBe(apiCallReturnValue);

      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [
          options.actions.savedObject.get(type1, 'bulk_get'),
          options.actions.savedObject.get(type2, 'bulk_get'),
        ],
        apiCallOptions.namespace
      );
      expect(options.baseClient.bulkGet).toHaveBeenCalledWith(objects, apiCallOptions);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'bulk_get',
        [type1, type2],
        { objects, options: apiCallOptions }
      );
    });
  });

  describe('#get', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(
        new Error('An actual error would happen here')
      );
      const client = new SecureSavedObjectsClientWrapper(options);

      await expect(client.get(type, 'bar')).rejects.toThrowError(options.generalError);
      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'get')],
        undefined
      );
      expect(options.errors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type = 'foo';
      const id = 'bar';
      const username = Symbol();
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
        hasAllRequested: false,
        username,
        privileges: {
          [options.actions.savedObject.get(type, 'get')]: false,
        },
      });

      const client = new SecureSavedObjectsClientWrapper(options);

      const apiCallOptions = Object.freeze({ namespace: 'some-ns' });
      await expect(client.get(type, id, apiCallOptions)).rejects.toThrowError(
        options.forbiddenError
      );

      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'get')],
        apiCallOptions.namespace
      );
      expect(options.errors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'get',
        [type],
        [options.actions.savedObject.get(type, 'get')],
        { type, id, options: apiCallOptions }
      );
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.get when authorized`, async () => {
      const type = 'foo';
      const id = 'bar';
      const username = Symbol();
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
        hasAllRequested: true,
        username,
        privileges: { [options.actions.savedObject.get(type, 'get')]: true },
      });

      const apiCallReturnValue = Symbol();
      options.baseClient.get.mockReturnValue(apiCallReturnValue as any);

      const client = new SecureSavedObjectsClientWrapper(options);

      const apiCallOptions = Object.freeze({ namespace: 'some-ns' });
      await expect(client.get(type, id, apiCallOptions)).resolves.toBe(apiCallReturnValue);

      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'get')],
        apiCallOptions.namespace
      );
      expect(options.baseClient.get).toHaveBeenCalledWith(type, id, apiCallOptions);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'get',
        [type],
        { type, id, options: apiCallOptions }
      );
    });
  });

  describe('#update', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(
        new Error('An actual error would happen here')
      );
      const client = new SecureSavedObjectsClientWrapper(options);

      await expect(client.update(type, 'bar', {})).rejects.toThrowError(options.generalError);
      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'update')],
        undefined
      );
      expect(options.errors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type = 'foo';
      const id = 'bar';
      const username = Symbol();
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
        hasAllRequested: false,
        username,
        privileges: {
          [options.actions.savedObject.get(type, 'update')]: false,
        },
      });

      const client = new SecureSavedObjectsClientWrapper(options);

      const attributes = { some: 'attr' };
      const apiCallOptions = Object.freeze({ namespace: 'some-ns' });
      await expect(client.update(type, id, attributes, apiCallOptions)).rejects.toThrowError(
        options.forbiddenError
      );

      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'update')],
        apiCallOptions.namespace
      );
      expect(options.errors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'update',
        [type],
        [options.actions.savedObject.get(type, 'update')],
        { type, id, attributes, options: apiCallOptions }
      );
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.update when authorized`, async () => {
      const type = 'foo';
      const id = 'bar';
      const username = Symbol();
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
        hasAllRequested: true,
        username,
        privileges: { [options.actions.savedObject.get(type, 'update')]: true },
      });

      const apiCallReturnValue = Symbol();
      options.baseClient.update.mockReturnValue(apiCallReturnValue as any);

      const client = new SecureSavedObjectsClientWrapper(options);

      const attributes = { some: 'attr' };
      const apiCallOptions = Object.freeze({ namespace: 'some-ns' });
      await expect(client.update(type, id, attributes, apiCallOptions)).resolves.toBe(
        apiCallReturnValue
      );

      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'update')],
        apiCallOptions.namespace
      );
      expect(options.baseClient.update).toHaveBeenCalledWith(type, id, attributes, apiCallOptions);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'update',
        [type],
        { type, id, attributes, options: apiCallOptions }
      );
    });
  });

  describe('#bulkUpdate', () => {
    test(`throws decorated GeneralError when hasPrivileges rejects promise`, async () => {
      const type = 'foo';
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockRejectedValue(
        new Error('An actual error would happen here')
      );
      const client = new SecureSavedObjectsClientWrapper(options);

      await expect(client.bulkUpdate([{ id: 'bar', type, attributes: {} }])).rejects.toThrowError(
        options.generalError
      );
      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'bulk_update')],
        undefined
      );
      expect(options.errors.decorateGeneralError).toHaveBeenCalledTimes(1);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`throws decorated ForbiddenError when unauthorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
        hasAllRequested: false,
        username,
        privileges: {
          [options.actions.savedObject.get(type, 'bulk_update')]: false,
        },
      });

      const client = new SecureSavedObjectsClientWrapper(options);

      const objects = [{ type, id: `bar-${type}`, attributes: {} }];
      const apiCallOptions = Object.freeze({ namespace: 'some-ns' });
      await expect(client.bulkUpdate(objects, apiCallOptions)).rejects.toThrowError(
        options.forbiddenError
      );

      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'bulk_update')],
        apiCallOptions.namespace
      );
      expect(options.errors.decorateForbiddenError).toHaveBeenCalledTimes(1);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).toHaveBeenCalledWith(
        username,
        'bulk_update',
        [type],
        [options.actions.savedObject.get(type, 'bulk_update')],
        { objects, options: apiCallOptions }
      );
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).not.toHaveBeenCalled();
    });

    test(`returns result of baseClient.bulkUpdate when authorized`, async () => {
      const type = 'foo';
      const username = Symbol();
      const options = createSecureSavedObjectsClientWrapperOptions();
      options.checkSavedObjectsPrivilegesAsCurrentUser.mockResolvedValue({
        hasAllRequested: true,
        username,
        privileges: {
          [options.actions.savedObject.get(type, 'bulk_update')]: true,
        },
      });

      const apiCallReturnValue = Symbol();
      options.baseClient.bulkUpdate.mockReturnValue(apiCallReturnValue as any);

      const client = new SecureSavedObjectsClientWrapper(options);

      const objects = [{ type, id: `id-${type}`, attributes: {} }];
      const apiCallOptions = Object.freeze({ namespace: 'some-ns' });
      await expect(client.bulkUpdate(objects, apiCallOptions)).resolves.toBe(apiCallReturnValue);

      expect(options.checkSavedObjectsPrivilegesAsCurrentUser).toHaveBeenCalledWith(
        [options.actions.savedObject.get(type, 'bulk_update')],
        apiCallOptions.namespace
      );
      expect(options.baseClient.bulkUpdate).toHaveBeenCalledWith(objects, apiCallOptions);
      expect(options.auditLogger.savedObjectsAuthorizationFailure).not.toHaveBeenCalled();
      expect(options.auditLogger.savedObjectsAuthorizationSuccess).toHaveBeenCalledWith(
        username,
        'bulk_update',
        [type],
        { objects, options: apiCallOptions }
      );
    });
  });
});
