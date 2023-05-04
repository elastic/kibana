/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';

import { CreateExceptionListItemOptions } from '../exception_lists/exception_list_client_types';
import { getCreateExceptionListItemOptionsMock } from '../exception_lists/exception_list_client.mock';
import { DataValidationError } from '../exception_lists/utils/errors';

import { ExtensionPointError } from './errors';
import {
  ExceptionsListPreCreateItemServerExtension,
  ExceptionsListPreUpdateItemServerExtension,
  ExtensionPoint,
  ExtensionPointStorageClientInterface,
  ExtensionPointStorageInterface,
  ServerExtensionCallbackContext,
} from './types';
import { createExtensionPointStorageMock } from './extension_point_storage.mock';

describe('When using the ExtensionPointStorageClient', () => {
  let storageClient: ExtensionPointStorageClientInterface;
  let logger: ReturnType<typeof loggerMock.create>;
  let extensionPointStorage: ExtensionPointStorageInterface;
  let callbackContext: ServerExtensionCallbackContext;
  let preCreateExtensionPointMock1: jest.Mocked<ExceptionsListPreCreateItemServerExtension>;
  let extensionPointsMocks: Array<jest.Mocked<ExtensionPoint>>;
  let callbackRunLog: string;

  const addAllExtensionPoints = (): void => {
    extensionPointsMocks.forEach((extensionPoint) => extensionPointStorage.add(extensionPoint));
  };

  beforeEach(() => {
    const extensionPointStorageMock = createExtensionPointStorageMock();

    callbackRunLog = '';
    ({ logger, extensionPointStorage, callbackContext } = extensionPointStorageMock);
    extensionPointStorage.clear();

    // Generic callback function that also logs to the `callbackRunLog` its id, so we know the order in which they ran.
    // Each callback also appends its `id` to the item's name property, so that we know the value from one callback is
    // flowing to the next.
    const callbackFn = async <
      T extends ExtensionPoint = ExtensionPoint,
      A extends Parameters<T['callback']>[0] = Parameters<T['callback']>[0]
    >(
      id: number,
      { data }: A
    ): Promise<A['data']> => {
      callbackRunLog += id;

      if ('name' in data) {
        return {
          ...data,
          name: `${data.name}-${id}`,
        };
      }

      return data;
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
          callbackFn.bind(window, 3) as ExceptionsListPreUpdateItemServerExtension['callback']
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
        createExceptionListItemOptionsMock,
        callbackContext
      );
      expect(callbackRunLog).toEqual('1245');
    });

    it('should provide `context` to every callback', async () => {
      await storageClient.pipeRun(
        'exceptionsListPreCreateItem',
        createExceptionListItemOptionsMock,
        callbackContext
      );
      for (const extensionPointsMock of extensionPointsMocks) {
        if (extensionPointsMock.type === 'exceptionsListPreCreateItem') {
          expect(extensionPointsMock.callback).toHaveBeenCalledWith(
            expect.objectContaining({
              context: callbackContext,
            })
          );
        }
      }
    });

    it('should pass the return value of one extensionPoint to the next', async () => {
      await storageClient.pipeRun(
        'exceptionsListPreCreateItem',
        createExceptionListItemOptionsMock,
        callbackContext
      );

      expect(extensionPointsMocks[0].callback).toHaveBeenCalledWith({
        context: callbackContext,
        data: createExceptionListItemOptionsMock,
      });
      expect(extensionPointsMocks[1].callback).toHaveBeenCalledWith({
        context: callbackContext,
        data: {
          ...createExceptionListItemOptionsMock,
          name: `${createExceptionListItemOptionsMock.name}-1`,
        },
      });
      expect(extensionPointsMocks[3].callback).toHaveBeenCalledWith({
        context: callbackContext,
        data: {
          ...createExceptionListItemOptionsMock,
          name: `${createExceptionListItemOptionsMock.name}-1-2`,
        },
      });
      expect(extensionPointsMocks[4].callback).toHaveBeenCalledWith({
        context: callbackContext,
        data: {
          ...createExceptionListItemOptionsMock,
          name: `${createExceptionListItemOptionsMock.name}-1-2-4`,
        },
      });
    });

    it('should return a data structure similar to the one provided initially', async () => {
      const result = await storageClient.pipeRun(
        'exceptionsListPreCreateItem',
        createExceptionListItemOptionsMock,
        callbackContext
      );

      expect(result).toEqual({
        ...createExceptionListItemOptionsMock,
        name: `${createExceptionListItemOptionsMock.name}-1-2-4-5`,
      });
    });

    it('should stop execution of other extension points after encountering one that `throw`s', async () => {
      const extensionError = new Error('foo');
      preCreateExtensionPointMock1.callback.mockImplementation(async () => {
        throw extensionError;
      });

      const resultPromise = storageClient.pipeRun(
        'exceptionsListPreCreateItem',
        createExceptionListItemOptionsMock,
        callbackContext
      );

      await expect(resultPromise).rejects.toBe(extensionError);
      expect(extensionPointsMocks[1].callback).not.toHaveBeenCalled();
    });

    it('should log an error and Throw if external callback returned invalid data', async () => {
      const validationError = new DataValidationError(['no bueno!']);

      await expect(() =>
        storageClient.pipeRun(
          'exceptionsListPreCreateItem',
          createExceptionListItemOptionsMock,
          callbackContext,
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
