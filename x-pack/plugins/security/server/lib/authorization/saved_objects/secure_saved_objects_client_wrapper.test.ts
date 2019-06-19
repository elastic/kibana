/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  SecureSavedObjectsClientWrapper,
  SecureSavedObjectsClientWrapperDeps,
} from './secure_saved_objects_client_wrapper';
import { SavedObjectsClientContract } from 'src/core/server';

describe('#errors', () => {
  test(`assigns errors from constructor to .errors`, () => {
    const errors = Symbol();

    const client = new SecureSavedObjectsClientWrapper(({
      errors,
    } as unknown) as SecureSavedObjectsClientWrapperDeps);

    expect(client.errors).toBe(errors);
  });
});

describe('#create', () => {
  test(`throws error when ensureSavedObjectsPrivileges throws an error`, async () => {
    const type = 'foo-type';
    const namespace = 'foo-namespace';
    const testError = new Error('test');
    const ensureSavedObjectsPrivileges = jest.fn().mockImplementation(async () => {
      throw testError;
    });
    const client = new SecureSavedObjectsClientWrapper({
      baseClient: (null as unknown) as SavedObjectsClientContract,
      ensureSavedObjectsPrivileges,
      errors: null as any,
    });
    const attributes = Symbol();
    const options = {
      namespace,
    };

    await expect(client.create(type, attributes as any, options as any)).rejects.toThrowError(
      testError
    );

    expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'create', namespace, {
      attributes,
      options,
      type,
    });
  });

  test(`returns result of baseClient.create when ensureSavedObjectsPrivileges succeeds`, async () => {
    const type = 'foo-type';
    const namespace = 'foo-namespace';
    const returnValue = Symbol();
    const mockBaseClient = ({
      create: jest.fn().mockReturnValue(returnValue),
    } as unknown) as SavedObjectsClientContract;
    const ensureSavedObjectsPrivileges = jest.fn();
    const client = new SecureSavedObjectsClientWrapper({
      baseClient: mockBaseClient,
      ensureSavedObjectsPrivileges,
      errors: null as any,
    });
    const attributes = Symbol();
    const options = {
      namespace,
    };

    const result = await client.create(type, attributes as any, options as any);

    expect(result).toBe(returnValue);
    expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'create', namespace, {
      attributes,
      options,
      type,
    });
    expect(mockBaseClient.create).toHaveBeenCalledWith(type, attributes, options);
  });
});

describe('#bulkCreate', () => {
  test(`throws error when ensureSavedObjectsPrivileges throws an error`, async () => {
    const type1 = 'foo-type';
    const type2 = 'bar-type';
    const namespace = 'foo-namespace';
    const testError = new Error('test');
    const ensureSavedObjectsPrivileges = jest.fn().mockImplementation(async () => {
      throw testError;
    });
    const client = new SecureSavedObjectsClientWrapper({
      baseClient: (null as unknown) as SavedObjectsClientContract,
      ensureSavedObjectsPrivileges,
      errors: null as any,
    });
    const objects = [
      { type: type1, attributes: {} },
      { type: type1, attributes: {} },
      { type: type2, attributes: {} },
    ];
    const options = { namespace };

    await expect(client.bulkCreate(objects, options as any)).rejects.toThrowError(testError);

    expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(
      [type1, type2],
      'bulk_create',
      namespace,
      {
        objects,
        options,
      }
    );
  });

  test(`returns result of baseClient.bulkCreate when ensureSavedObjectsPrivileges succeeds`, async () => {
    const type1 = 'foo-type';
    const type2 = 'bar-type';
    const namespace = 'foo-namespace';
    const returnValue = Symbol();
    const mockBaseClient = ({
      bulkCreate: jest.fn().mockReturnValue(returnValue),
    } as unknown) as SavedObjectsClientContract;
    const ensureSavedObjectsPrivileges = jest.fn();
    const client = new SecureSavedObjectsClientWrapper({
      baseClient: mockBaseClient,
      ensureSavedObjectsPrivileges,
      errors: null as any,
    });
    const objects = [
      { type: type1, otherThing: 'sup', attributes: {} },
      { type: type2, otherThing: 'everyone', attributes: {} },
    ];
    const options = { namespace };

    const result = await client.bulkCreate(objects, options as any);

    expect(result).toBe(returnValue);
    expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(
      [type1, type2],
      'bulk_create',
      namespace,
      {
        objects,
        options,
      }
    );
    expect(mockBaseClient.bulkCreate).toHaveBeenCalledWith(objects, options);
  });
});

describe('#delete', () => {
  test(`throws error when ensureSavedObjectsPrivileges throws an error`, async () => {
    const type = 'foo-type';
    const namespace = 'foo-namespace';
    const testError = new Error('test');
    const ensureSavedObjectsPrivileges = jest.fn().mockImplementation(async () => {
      throw testError;
    });
    const client = new SecureSavedObjectsClientWrapper({
      baseClient: (null as unknown) as SavedObjectsClientContract,
      ensureSavedObjectsPrivileges,
      errors: null as any,
    });
    const id = Symbol();
    const options = { namespace };

    await expect(client.delete(type, id as any, options as any)).rejects.toThrowError(testError);

    expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'delete', namespace, {
      type,
      id,
      options,
    });
  });

  test(`returns result of baseClient.delete when ensureSavedObjectsPrivileges succeeds`, async () => {
    const type = 'foo-type';
    const namespace = 'foo-namespace';
    const returnValue = Symbol();
    const mockBaseClient = ({
      delete: jest.fn().mockReturnValue(returnValue),
    } as unknown) as SavedObjectsClientContract;
    const ensureSavedObjectsPrivileges = jest.fn();
    const client = new SecureSavedObjectsClientWrapper({
      baseClient: mockBaseClient,
      ensureSavedObjectsPrivileges,
      errors: null as any,
    });
    const id = Symbol();
    const options = { namespace };

    const result = await client.delete(type, id as any, options as any);

    expect(result).toBe(returnValue);
    expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'delete', namespace, {
      type,
      options,
      id,
    });
    expect(mockBaseClient.delete).toHaveBeenCalledWith(type, id, options);
  });
});

describe('#find', () => {
  test(`throws error when ensureSavedObjectsPrivileges throws an error`, async () => {
    const type1 = 'foo-type';
    const type2 = 'bar-type';
    const namespace = 'foo-namespace';
    const testError = new Error('test');
    const ensureSavedObjectsPrivileges = jest.fn().mockImplementation(async () => {
      throw testError;
    });
    const client = new SecureSavedObjectsClientWrapper({
      baseClient: (null as unknown) as SavedObjectsClientContract,
      ensureSavedObjectsPrivileges,
      errors: null as any,
    });
    const options = { type: [type1, type2], namespace };

    await expect(client.find(options)).rejects.toThrowError(testError);

    expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith([type1, type2], 'find', namespace, {
      options,
    });
  });

  test(`returns result of baseClient.find when ensureSavedObjectsPrivileges succeeds`, async () => {
    const type = 'foo-type';
    const namespace = 'foo-namespace';
    const returnValue = Symbol();
    const mockBaseClient = ({
      find: jest.fn().mockReturnValue(returnValue),
    } as unknown) as SavedObjectsClientContract;
    const ensureSavedObjectsPrivileges = jest.fn();
    const client = new SecureSavedObjectsClientWrapper({
      baseClient: mockBaseClient,
      ensureSavedObjectsPrivileges,
      errors: null as any,
    });
    const options = { type, namespace };

    const result = await client.find(options);

    expect(result).toBe(returnValue);

    expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'find', namespace, {
      options,
    });
    expect(mockBaseClient.find).toHaveBeenCalledWith(options);
  });
});

describe('#bulkGet', () => {
  test(`throws error when ensureSavedObjectsPrivileges throws an error`, async () => {
    const type1 = 'foo-type';
    const type2 = 'bar-type';
    const namespace = 'foo-namespace';
    const testError = new Error('test');
    const ensureSavedObjectsPrivileges = jest.fn().mockImplementation(async () => {
      throw testError;
    });
    const client = new SecureSavedObjectsClientWrapper({
      baseClient: (null as unknown) as SavedObjectsClientContract,
      ensureSavedObjectsPrivileges,
      errors: null as any,
    });
    const objects = [
      { type: type1, id: 'foo' },
      { type: type1, id: 'bar' },
      { type: type2, id: 'baz' },
    ];
    const options = { namespace };

    await expect(client.bulkGet(objects, options as any)).rejects.toThrowError(testError);

    expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(
      [type1, type2],
      'bulk_get',
      namespace,
      {
        objects,
        options,
      }
    );
  });

  test(`returns result of baseClient.bulkGet when ensureSavedObjectsPrivileges succeeds`, async () => {
    const type1 = 'foo-type';
    const type2 = 'bar-type';
    const namespace = 'foo-namespace';
    const returnValue = Symbol();
    const mockBaseClient = ({
      bulkGet: jest.fn().mockReturnValue(returnValue),
    } as unknown) as SavedObjectsClientContract;
    const ensureSavedObjectsPrivileges = jest.fn();
    const client = new SecureSavedObjectsClientWrapper({
      baseClient: mockBaseClient,
      ensureSavedObjectsPrivileges,
      errors: null as any,
    });
    const objects = [{ type: type1, id: 'foo-id' }, { type: type2, id: 'bar-id' }];
    const options = { namespace };

    const result = await client.bulkGet(objects, options as any);

    expect(result).toBe(returnValue);
    expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(
      [type1, type2],
      'bulk_get',
      namespace,
      {
        objects,
        options,
      }
    );
    expect(mockBaseClient.bulkGet).toHaveBeenCalledWith(objects, options);
  });
});

describe('#get', () => {
  test(`throws error when ensureSavedObjectsPrivileges throws an error`, async () => {
    const type = 'foo-type';
    const namespace = 'foo-namespace';
    const testError = new Error('test');
    const ensureSavedObjectsPrivileges = jest.fn().mockImplementation(async () => {
      throw testError;
    });
    const client = new SecureSavedObjectsClientWrapper({
      baseClient: (null as unknown) as SavedObjectsClientContract,
      ensureSavedObjectsPrivileges,
      errors: null as any,
    });
    const id = Symbol();
    const options = { namespace };

    await expect(client.get(type, id as any, options as any)).rejects.toThrowError(testError);

    expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'get', namespace, {
      type,
      id,
      options,
    });
  });

  test(`returns result of baseClient.get when ensureSavedObjectsPrivileges succeeds`, async () => {
    const type = 'foo-type';
    const namespace = 'foo-namespace';
    const returnValue = Symbol();
    const mockBaseClient = ({
      get: jest.fn().mockReturnValue(returnValue),
    } as unknown) as SavedObjectsClientContract;
    const ensureSavedObjectsPrivileges = jest.fn();
    const client = new SecureSavedObjectsClientWrapper({
      baseClient: mockBaseClient,
      ensureSavedObjectsPrivileges,
      errors: null as any,
    });
    const id = Symbol();
    const options = { namespace };

    const result = await client.get(type, id as any, options as any);

    expect(result).toBe(returnValue);

    expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'get', namespace, {
      type,
      id,
      options,
    });
    expect(mockBaseClient.get).toHaveBeenCalledWith(type, id, options);
  });
});

describe('#update', () => {
  test(`throws error when ensureSavedObjectsPrivileges throws an error`, async () => {
    const type = 'foo-type';
    const namespace = 'foo-namespace';
    const testError = new Error('test');
    const ensureSavedObjectsPrivileges = jest.fn().mockImplementation(async () => {
      throw testError;
    });
    const client = new SecureSavedObjectsClientWrapper({
      baseClient: (null as unknown) as SavedObjectsClientContract,
      ensureSavedObjectsPrivileges,
      errors: null as any,
    });
    const id = Symbol();
    const attributes = Symbol();
    const options = { namespace };

    await expect(
      client.update(type, id as any, attributes as any, options as any)
    ).rejects.toThrowError(testError);

    expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'update', namespace, {
      type,
      id,
      attributes,
      options,
    });
  });

  test(`returns result of baseClient.update when ensureSavedObjectsPrivileges succeeds`, async () => {
    const type = 'foo-type';
    const namespace = 'foo-namespace';
    const returnValue = Symbol();
    const mockBaseClient = ({
      update: jest.fn().mockReturnValue(returnValue),
    } as unknown) as SavedObjectsClientContract;
    const ensureSavedObjectsPrivileges = jest.fn();
    const client = new SecureSavedObjectsClientWrapper({
      baseClient: mockBaseClient,
      ensureSavedObjectsPrivileges,
      errors: null as any,
    });
    const id = Symbol();
    const attributes = Symbol();
    const options = { namespace };

    const result = await client.update(type, id as any, attributes as any, options as any);

    expect(result).toBe(returnValue);

    expect(ensureSavedObjectsPrivileges).toHaveBeenCalledWith(type, 'update', namespace, {
      type,
      id,
      options,
      attributes,
    });
    expect(mockBaseClient.update).toHaveBeenCalledWith(type, id, attributes, options);
  });
});
