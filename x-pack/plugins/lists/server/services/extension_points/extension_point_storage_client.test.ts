/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging/mocks';

import { CreateExceptionListItemOptions } from '../exception_lists/exception_list_client_types';
import { getCreateExceptionListItemOptionsMock } from '../exception_lists/exception_list_client.mock';
import { DataValidationError } from '../exception_lists/utils/errors';

import { ExtensionPointError } from './errors';
import {
  ExceptionListPreUpdateItemServerExtension,
  ExceptionsListPreCreateItemServerExtension,
  ExtensionPoint,
  ExtensionPointStorageClientInterface,
  ExtensionPointStorageInterface,
} from './types';
import { createExtensionPointStorageMock } from './extension_point_storage.mock';

describe('When using the ExtensionPointStorageClient', () => {
  let storageClient: ExtensionPointStorageClientInterface;
  let logger: ReturnType<typeof loggerMock.create>;
  let extensionPointStorage: ExtensionPointStorageInterface;
  let preCreateExtensionPointMock1: jest.Mocked<ExceptionsListPreCreateItemServerExtension>;
  let extensionPointsMocks: Array<jest.Mocked<ExtensionPoint>>;
  let callbackRunLog: string;

  const addAllExtensionPoints = (): void => {
    extensionPointsMocks.forEach((extensionPoint) => extensionPointStorage.add(extensionPoint));
  };

  beforeEach(() => {
    const storageContext = createExtensionPointStorageMock();

    callbackRunLog = '';
    ({ logger, extensionPointStorage } = storageContext);
    extensionPointStorage.clear();

    // Generic callback function that also logs to the `callbackRunLog` its id, so we know the order in which they ran.
    // Each callback also appends its `id` to the item's name property, so that we know the value from one callback is
    // flowing to the next.
    const callbackFn = async <
      T extends ExtensionPoint = ExtensionPoint,
      A extends Parameters<T['callback']>[0] = Parameters<T['callback']>[0]
    >(
      id: number,
      arg: A
    ): Promise<A> => {
      callbackRunLog += id;
      return {
        ...arg,
        name: `${arg.name}-${id}`,
      };
    };
    preCreateExtensionPointMock1 = {
      callback: jest.fn(
        callbackFn.bind(window, 1) as ExceptionsListPreCreateItemServerExtension['callback']
      ),
      type: 'exceptionsListPreCreateItem',
    };
    extensionPointsMocks = [
      preCreateExtensionPointMock1,
      {
        callback: jest.fn(
          callbackFn.bind(window, 2) as ExceptionsListPreCreateItemServerExtension['callback']
        ),
        type: 'exceptionsListPreCreateItem',
      },
      {
        callback: jest.fn(
          callbackFn.bind(window, 3) as ExceptionListPreUpdateItemServerExtension['callback']
        ),
        type: 'exceptionsListPreUpdateItem',
      },
      {
        callback: jest.fn(
          callbackFn.bind(window, 4) as ExceptionsListPreCreateItemServerExtension['callback']
        ),
        type: 'exceptionsListPreCreateItem',
      },
      {
        callback: jest.fn(
          callbackFn.bind(window, 5) as ExceptionsListPreCreateItemServerExtension['callback']
        ),
        type: 'exceptionsListPreCreateItem',
      },
    ];
    storageClient = extensionPointStorage.getClient();
  });

  it('should get() a Set of extension points by type', () => {
    extensionPointStorage.add(preCreateExtensionPointMock1);
    const extensionPointSet = storageClient.get('exceptionsListPreCreateItem');

    expect(extensionPointSet?.size).toBe(1);
    expect(extensionPointSet?.has(preCreateExtensionPointMock1)).toBe(true);
  });

  it('should return `undefined` when get() does not have any extension points', () => {
    expect(storageClient.get('exceptionsListPreUpdateItem')).toBeUndefined();
  });

  describe('and executing a `pipeRun()`', () => {
    let createExceptionListItemOptionsMock: CreateExceptionListItemOptions;

    beforeEach(() => {
      createExceptionListItemOptionsMock = getCreateExceptionListItemOptionsMock();
      addAllExtensionPoints();
    });

    it('should run extension point callbacks serially', async () => {
      await storageClient.pipeRun(
        'exceptionsListPreCreateItem',
        createExceptionListItemOptionsMock
      );
      expect(callbackRunLog).toEqual('1245');
    });

    it('should pass the return value of one extensionPoint to the next', async () => {
      await storageClient.pipeRun(
        'exceptionsListPreCreateItem',
        createExceptionListItemOptionsMock
      );

      expect(extensionPointsMocks[0].callback).toHaveBeenCalledWith(
        createExceptionListItemOptionsMock
      );
      expect(extensionPointsMocks[1].callback).toHaveBeenCalledWith({
        ...createExceptionListItemOptionsMock,
        name: `${createExceptionListItemOptionsMock.name}-1`,
      });
      expect(extensionPointsMocks[3].callback).toHaveBeenCalledWith({
        ...createExceptionListItemOptionsMock,
        name: `${createExceptionListItemOptionsMock.name}-1-2`,
      });
      expect(extensionPointsMocks[4].callback).toHaveBeenCalledWith({
        ...createExceptionListItemOptionsMock,
        name: `${createExceptionListItemOptionsMock.name}-1-2-4`,
      });
    });

    it('should return a data structure similar to the one provided initially', async () => {
      const result = await storageClient.pipeRun(
        'exceptionsListPreCreateItem',
        createExceptionListItemOptionsMock
      );

      expect(result).toEqual({
        ...createExceptionListItemOptionsMock,
        name: `${createExceptionListItemOptionsMock.name}-1-2-4-5`,
      });
    });

    it("should log an error if extension point callback Throw's", async () => {
      const extensionError = new Error('foo');
      preCreateExtensionPointMock1.callback.mockImplementation(async () => {
        throw extensionError;
      });

      await storageClient.pipeRun(
        'exceptionsListPreCreateItem',
        createExceptionListItemOptionsMock
      );

      expect(logger.error).toHaveBeenCalledWith(expect.any(ExtensionPointError));
      expect(logger.error.mock.calls[0][0]).toMatchObject({ meta: extensionError });
    });

    it('should continue to other extension points after encountering one that `throw`s', async () => {
      const extensionError = new Error('foo');
      preCreateExtensionPointMock1.callback.mockImplementation(async () => {
        throw extensionError;
      });

      const result = await storageClient.pipeRun(
        'exceptionsListPreCreateItem',
        createExceptionListItemOptionsMock
      );

      expect(result).toEqual({
        ...createExceptionListItemOptionsMock,
        name: `${createExceptionListItemOptionsMock.name}-2-4-5`,
      });
    });

    it('should log an error and Throw if external callback returned invalid data', async () => {
      const validationError = new DataValidationError(['no bueno!']);

      await expect(() =>
        storageClient.pipeRun(
          'exceptionsListPreCreateItem',
          createExceptionListItemOptionsMock,
          () => {
            return validationError;
          }
        )
      ).rejects.toBe(validationError);
      expect(logger.error).toHaveBeenCalledWith(expect.any(ExtensionPointError));
      expect(logger.error.mock.calls[0][0]).toMatchObject({ meta: { validationError } });
    });
  });
});
