/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockedLogger, loggerMock } from '@kbn/logging-mocks';

import { httpServerMock } from '../../../../../../src/core/server/mocks';
import { ExceptionListClient } from '../exception_lists/exception_list_client';

import { ExtensionPointStorage } from './extension_point_storage';
import {
  ExceptionsListPreCreateItemServerExtension,
  ExceptionsListPreDeleteItemServerExtension,
  ExceptionsListPreExportServerExtension,
  ExceptionsListPreGetOneItemServerExtension,
  ExceptionsListPreImportServerExtension,
  ExceptionsListPreMultiListFindServerExtension,
  ExceptionsListPreSingleListFindServerExtension,
  ExceptionsListPreSummaryServerExtension,
  ExceptionsListPreUpdateItemServerExtension,
  ExtensionPointStorageInterface,
  ServerExtensionCallbackContext,
} from './types';

export interface ExtensionPointStorageContextMock {
  extensionPointStorage: ExtensionPointStorageInterface;
  /** Mocked logger instance used in initializing the ExtensionPointStorage instance  */
  logger: MockedLogger;
  /** An Exception List Item pre-create extension point added to the storage. Appends `-1` to the data's `name` attribute */
  exceptionPreCreate: jest.Mocked<ExceptionsListPreCreateItemServerExtension>;
  /** An Exception List Item pre-update extension point added to the storage. Appends `-2` to the data's `name` attribute */
  exceptionPreUpdate: jest.Mocked<ExceptionsListPreUpdateItemServerExtension>;
  /** An Exception List Item pre-get extension point added to the storage */
  exceptionPreGetOne: jest.Mocked<ExceptionsListPreGetOneItemServerExtension>;
  /** an exception list pre-find extension when searching a single list */
  exceptionPreSingleListFind: jest.Mocked<ExceptionsListPreSingleListFindServerExtension>;
  /** an exception list pre-find extension when searching a multiple lists */
  exceptionPreMultiListFind: jest.Mocked<ExceptionsListPreMultiListFindServerExtension>;
  /** an exception list pre-export extension */
  exceptionPreExport: jest.Mocked<ExceptionsListPreExportServerExtension>;
  /** an exception list pre-summary extension */
  exceptionPreSummary: jest.Mocked<ExceptionsListPreSummaryServerExtension>;
  /** an exception list pre-delete extension */
  exceptionPreDelete: jest.Mocked<ExceptionsListPreDeleteItemServerExtension>;
  callbackContext: jest.Mocked<ServerExtensionCallbackContext>;
  /** An Exception List pre-import extension point */
  exceptionPreImport: jest.Mocked<ExceptionsListPreImportServerExtension>;
}

export const createExtensionPointStorageMock = (
  logger: ReturnType<typeof loggerMock.create> = loggerMock.create()
): ExtensionPointStorageContextMock => {
  const extensionPointStorage = new ExtensionPointStorage(logger);

  const exceptionPreCreate: ExtensionPointStorageContextMock['exceptionPreCreate'] = {
    callback: jest.fn(async ({ data }) => {
      return {
        ...data,
        name: `${data.name}-1`,
      };
    }),
    type: 'exceptionsListPreCreateItem',
  };

  const exceptionPreUpdate: ExtensionPointStorageContextMock['exceptionPreUpdate'] = {
    callback: jest.fn(async ({ data }) => {
      return {
        ...data,
        name: `${data.name}-1`,
      };
    }),
    type: 'exceptionsListPreUpdateItem',
  };

  const exceptionPreGetOne: ExtensionPointStorageContextMock['exceptionPreGetOne'] = {
    callback: jest.fn(async ({ data }) => data),
    type: 'exceptionsListPreGetOneItem',
  };

  const exceptionPreSingleListFind: ExtensionPointStorageContextMock['exceptionPreSingleListFind'] =
    {
      callback: jest.fn(async ({ data }) => data),
      type: 'exceptionsListPreSingleListFind',
    };

  const exceptionPreMultiListFind: ExtensionPointStorageContextMock['exceptionPreMultiListFind'] = {
    callback: jest.fn(async ({ data }) => data),
    type: 'exceptionsListPreMultiListFind',
  };

  const exceptionPreExport: ExtensionPointStorageContextMock['exceptionPreExport'] = {
    callback: jest.fn(async ({ data }) => data),
    type: 'exceptionsListPreExport',
  };

  const exceptionPreSummary: ExtensionPointStorageContextMock['exceptionPreSummary'] = {
    callback: jest.fn(async ({ data }) => data),
    type: 'exceptionsListPreSummary',
  };

  const exceptionPreDelete: ExtensionPointStorageContextMock['exceptionPreDelete'] = {
    callback: jest.fn(async ({ data }) => data),
    type: 'exceptionsListPreDeleteItem',
  };

  const exceptionPreImport: ExtensionPointStorageContextMock['exceptionPreImport'] = {
    callback: jest.fn(async ({ data }) => data),
    type: 'exceptionsListPreImport',
  };

  extensionPointStorage.add(exceptionPreCreate);
  extensionPointStorage.add(exceptionPreUpdate);
  extensionPointStorage.add(exceptionPreGetOne);
  extensionPointStorage.add(exceptionPreSingleListFind);
  extensionPointStorage.add(exceptionPreMultiListFind);
  extensionPointStorage.add(exceptionPreExport);
  extensionPointStorage.add(exceptionPreSummary);
  extensionPointStorage.add(exceptionPreDelete);
  extensionPointStorage.add(exceptionPreImport);

  return {
    callbackContext: {
      exceptionListClient: {} as unknown as ExceptionListClient,
      request: httpServerMock.createKibanaRequest(),
    },
    exceptionPreCreate,
    exceptionPreDelete,
    exceptionPreExport,
    exceptionPreGetOne,
    exceptionPreImport,
    exceptionPreMultiListFind,
    exceptionPreSingleListFind,
    exceptionPreSummary,
    exceptionPreUpdate,
    extensionPointStorage,
    logger,
  };
};
