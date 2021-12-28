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

    describe('when execution of server extensions are enabled', () => {
      // Test client methods that use the `pipeRun()` method of the ExtensionPointStorageClient`
      describe.each([
        [
          'createExceptionListItem',
          (): ExceptionListClient['createExceptionListItem'] => {
            return exceptionListClient.createExceptionListItem.bind(exceptionListClient);
          },
          (): Parameters<ExceptionListClient['createExceptionListItem']>[0] => {
            return getCreateExceptionListItemOptionsMock();
          },
          (): ExtensionPointStorageContextMock['exceptionPreCreateCallback'] => {
            return extensionPointStorageContext.exceptionPreCreateCallback;
          },
        ],
        [
          'updateExceptionListItem',
          (): ExceptionListClient['updateExceptionListItem'] => {
            return exceptionListClient.updateExceptionListItem.bind(exceptionListClient);
          },
          (): Parameters<ExceptionListClient['updateExceptionListItem']>[0] => {
            return getUpdateExceptionListItemOptionsMock();
          },
          (): ExtensionPointStorageContextMock['exceptionPreUpdateCallback'] => {
            return extensionPointStorageContext.exceptionPreUpdateCallback;
          },
        ],
      ])(
        'and executing `ExceptionListClient#%s()`',
        (methodName, getExceptionListClientMethod, getMethodParams, getExtensionPointCallback) => {
          beforeEach(() => {
            exceptionListClient = new ExceptionListClient({
              disableServerExtensionPoints: false,
              savedObjectsClient: getExceptionListSavedObjectClientMock(),
              serverExtensionsClient:
                extensionPointStorageContext.extensionPointStorage.getClient(),
              user: 'elastic',
            });
          });

          it('should execute extension point callbacks', async () => {
            // @ts-expect-error
            await getExceptionListClientMethod()(getMethodParams());

            expect(getExtensionPointCallback()).toHaveBeenCalled();
          });

          it('should validate extension point callback returned data and throw if not valid', async () => {
            const extensionPointCallback = getExtensionPointCallback();
            // @ts-expect-error
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            extensionPointCallback.mockImplementation(({ entries, ...rest }) => {
              return rest;
            });

            // @ts-expect-error
            const methodResponsePromise = getExceptionListClientMethod()(getMethodParams());

            await expect(methodResponsePromise).rejects.toBeInstanceOf(DataValidationError);
            await expect(methodResponsePromise).rejects.toEqual(
              expect.objectContaining({
                reason: ['Invalid value "undefined" supplied to "entries"'],
              })
            );
          });

          it('should use data returned from extension point callbacks when saving', async () => {
            // @ts-expect-error
            await expect(getExceptionListClientMethod()(getMethodParams())).resolves.toEqual(
              expect.objectContaining({
                name: 'some name-1',
              })
            );
          });
        }
      );
    });

    describe('when server extension are disabled', () => {
      //
    });
  });
});
