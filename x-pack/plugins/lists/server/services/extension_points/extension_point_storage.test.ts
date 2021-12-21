/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';
import { loggerMock } from '@kbn/logging/mocks';

import { getCreateExceptionListItemOptionsMock } from '../exception_lists/exception_list_client.mock';
import { CreateExceptionListItemOptions } from '../exception_lists/exception_list_client_types';

import {
  ExtensionPointStorage,
  ExtensionPointStorageClient,
  ExtensionPointStorageClientInterface,
  ExtensionPointStorageInterface,
} from './extension_point_storage';
import { ExceptionsListPreCreateItemServerExtension, ExtensionPoint } from './types';

describe('When using ExtensionPointStorage', () => {
  let logger: Logger;
  let storageService: ExtensionPointStorageInterface;
  let preCreateExtensionPointMock: jest.Mocked<ExceptionsListPreCreateItemServerExtension>;
  let extensionPointsMocks: Array<jest.Mocked<ExtensionPoint>>;
  let callbackRunLog: string;

  const addAllExtensionPoints = (): void => {
    extensionPointsMocks.forEach((extensionPoint) => storageService.add(extensionPoint));
  };

  beforeEach(() => {
    callbackRunLog = '';
    logger = loggerMock.create();
    storageService = new ExtensionPointStorage(logger);

    // Generic callback function that alos logs to the `callbackRunLog` its id, so we know the order in which they ran.
    // Each callback also appends its `id` to the item's name property, so that we know the value from one callback is
    // flowing to the next.
    const callbackFn = async (
      id: number,
      arg: Parameters<ExtensionPoint['callback']>[0]
    ): Promise<Parameters<ExtensionPoint['callback']>[0]> => {
      callbackRunLog += id;
      return {
        ...arg,
        name: `${arg.name}-${id}`,
      };
    };
    preCreateExtensionPointMock = {
      callback: jest.fn(callbackFn.bind(window, 1)),
      type: 'exceptionsListPreCreateItem',
    };
    extensionPointsMocks = [
      preCreateExtensionPointMock,
      {
        callback: jest.fn(callbackFn.bind(window, 2)),
        type: 'exceptionsListPreCreateItem',
      },
      {
        callback: jest.fn(callbackFn.bind(window, 3)),
        type: 'exceptionsListPreUpdateItem',
      },
      {
        callback: jest.fn(callbackFn.bind(window, 4)),
        type: 'exceptionsListPreCreateItem',
      },
      {
        callback: jest.fn(callbackFn.bind(window, 5)),
        type: 'exceptionsListPreCreateItem',
      },
    ];
  });

  it('should be able to add() extension point and get() it', () => {
    storageService.add(preCreateExtensionPointMock);
    const extensionPointSet = storageService.get('exceptionsListPreCreateItem');

    expect(extensionPointSet?.size).toBe(1);
    expect(extensionPointSet?.has(preCreateExtensionPointMock)).toBe(true);
  });

  it('should return `undefined` on get() when no extension points are registered', () => {
    expect(storageService.get('exceptionsListPreCreateItem')).toBeUndefined();
  });

  it('should capture `.stack` from where extension point was registered', () => {
    storageService.add(preCreateExtensionPointMock);

    expect(storageService.getExtensionRegistrationSource(preCreateExtensionPointMock)).toContain(
      'extension_point_storage.test'
    );
  });

  it('should clear() all extensions', () => {
    addAllExtensionPoints();
    storageService.clear();

    expect(storageService.get('exceptionsListPreCreateItem')).toBeUndefined();
    expect(storageService.get('exceptionsListPreUpdateItem')).toBeUndefined();
  });

  it('should return a client', () => {
    expect(storageService.getClient()).toBeInstanceOf(ExtensionPointStorageClient);
  });

  describe('and using the ExtensionPointStorageClient', () => {
    let storageClient: ExtensionPointStorageClientInterface;

    beforeEach(() => {
      storageClient = storageService.getClient();
    });

    it('should get() a Set of extension points by type', () => {
      storageService.add(preCreateExtensionPointMock);
      const extensionPointSet = storageClient.get('exceptionsListPreCreateItem');

      expect(extensionPointSet?.size).toBe(1);
      expect(extensionPointSet?.has(preCreateExtensionPointMock)).toBe(true);
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

      it.todo("should log an error if extension point callback Throw's");

      it.todo('should continue to other extension points after encountering one that Threw');

      it.todo('should log an error and Throw if external callback returned invalid data');
    });
  });
});
