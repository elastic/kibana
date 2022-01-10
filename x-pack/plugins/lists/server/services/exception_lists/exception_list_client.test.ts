/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getExceptionListItemSchemaMock } from '../../../common/schemas/response/exception_list_item_schema.mock';
import { getExceptionListSchemaMock } from '../../../common/schemas/response/exception_list_schema.mock';
import {
  ExtensionPointStorageContextMock,
  createExtensionPointStorageMock,
} from '../extension_points/extension_point_storage.mock';
import type { ExtensionPointCallbackArgument } from '../extension_points';

import {
  getCreateExceptionListItemOptionsMock,
  getExceptionListClientMock,
  getExceptionListSavedObjectClientMock,
  getUpdateExceptionListItemOptionsMock,
} from './exception_list_client.mock';
import { ExceptionListClient } from './exception_list_client';
import { DataValidationError } from './utils/errors';

describe('exception_list_client', () => {
  describe('Mock client sanity checks', () => {
    test('it returns the exception list as expected', async () => {
      const mock = getExceptionListClientMock();
      const list = await mock.getExceptionList({
        id: '123',
        listId: '123',
        namespaceType: 'single',
      });
      expect(list).toEqual(getExceptionListSchemaMock());
    });

    test('it returns the the exception list item as expected', async () => {
      const mock = getExceptionListClientMock();
      const listItem = await mock.getExceptionListItem({
        id: '123',
        itemId: '123',
        namespaceType: 'single',
      });
      expect(listItem).toEqual(getExceptionListItemSchemaMock());
    });
  });

  describe('server extension points execution', () => {
    let extensionPointStorageContext: ExtensionPointStorageContextMock;
    let exceptionListClient: ExceptionListClient;

    beforeEach(() => {
      extensionPointStorageContext = createExtensionPointStorageMock();
    });

    it('should initialize class instance with `enableServerExtensionPoints` enabled by default', async () => {
      exceptionListClient = new ExceptionListClient({
        savedObjectsClient: getExceptionListSavedObjectClientMock(),
        serverExtensionsClient: extensionPointStorageContext.extensionPointStorage.getClient(),
        user: 'elastic',
      });

      await exceptionListClient.createExceptionListItem(getCreateExceptionListItemOptionsMock());

      expect(extensionPointStorageContext.exceptionPreCreate.callback).toHaveBeenCalled();
    });

    // Test client methods that use the `pipeRun()` method of the ExtensionPointStorageClient`
    describe.each([
      [
        'createExceptionListItem',
        (): ReturnType<ExceptionListClient['createExceptionListItem']> => {
          return exceptionListClient.createExceptionListItem(
            getCreateExceptionListItemOptionsMock()
          );
        },
        (): ExtensionPointStorageContextMock['exceptionPreCreate']['callback'] => {
          return extensionPointStorageContext.exceptionPreCreate.callback;
        },
      ],

      [
        'updateExceptionListItem',
        (): ReturnType<ExceptionListClient['updateExceptionListItem']> => {
          return exceptionListClient.updateExceptionListItem(
            getUpdateExceptionListItemOptionsMock()
          );
        },
        (): ExtensionPointStorageContextMock['exceptionPreUpdate']['callback'] => {
          return extensionPointStorageContext.exceptionPreUpdate.callback;
        },
      ],
    ])(
      'and calling `ExceptionListClient#%s()`',
      (methodName, callExceptionListClientMethod, getExtensionPointCallback) => {
        describe('and server extension points are enabled', () => {
          beforeEach(() => {
            exceptionListClient = new ExceptionListClient({
              savedObjectsClient: getExceptionListSavedObjectClientMock(),
              serverExtensionsClient:
                extensionPointStorageContext.extensionPointStorage.getClient(),
              user: 'elastic',
            });
          });

          it('should execute extension point callbacks', async () => {
            await callExceptionListClientMethod();

            expect(getExtensionPointCallback()).toHaveBeenCalled();
          });

          it('should validate extension point callback returned data and throw if not valid', async () => {
            const extensionPointCallback = getExtensionPointCallback();
            extensionPointCallback.mockImplementation(async (args) => {
              const { entries, ...rest } = args as ExtensionPointCallbackArgument;

              expect(entries).toBeTruthy(); // Test entries to exist since we exclude it.
              return rest as ExtensionPointCallbackArgument;
            });

            const methodResponsePromise = callExceptionListClientMethod();

            await expect(methodResponsePromise).rejects.toBeInstanceOf(DataValidationError);
            await expect(methodResponsePromise).rejects.toEqual(
              expect.objectContaining({
                reason: ['Invalid value "undefined" supplied to "entries"'],
              })
            );
          });

          it('should use data returned from extension point callbacks when saving', async () => {
            await expect(callExceptionListClientMethod()).resolves.toEqual(
              expect.objectContaining({
                name: 'some name-1',
              })
            );
          });
        });

        describe('and server extension points are DISABLED', () => {
          beforeEach(() => {
            exceptionListClient = new ExceptionListClient({
              enableServerExtensionPoints: false,
              savedObjectsClient: getExceptionListSavedObjectClientMock(),
              serverExtensionsClient:
                extensionPointStorageContext.extensionPointStorage.getClient(),
              user: 'elastic',
            });
          });

          it('should NOT call server extension points', async () => {
            await callExceptionListClientMethod();

            expect(getExtensionPointCallback()).not.toHaveBeenCalled();
          });
        });
      }
    );
  });
});
