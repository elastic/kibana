/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockedLogger, loggerMock } from '@kbn/logging/mocks';

import { ExtensionPointStorage } from './extension_point_storage';
import {
  ExceptionListPreUpdateItemServerExtension,
  ExceptionsListPreCreateItemServerExtension,
  ExtensionPointStorageInterface,
} from './types';

export interface ExtensionPointStorageContextMock {
  extensionPointStorage: ExtensionPointStorageInterface;
  /** Mocked logger instance used in initializing the ExtensionPointStorage instance  */
  logger: MockedLogger;
  /** An Exception List Item pre-create extension point added to the storage. Appends `-1` to the data's `name` attribute */
  exceptionPreCreate: jest.Mocked<ExceptionsListPreCreateItemServerExtension>;
  /** An Exception List Item pre-update extension point added to the storage. Appends `-2` to the data's `name` attribute */
  exceptionPreUpdate: jest.Mocked<ExceptionListPreUpdateItemServerExtension>;
}

export const createExtensionPointStorageMock = (
  logger: ReturnType<typeof loggerMock.create> = loggerMock.create()
): ExtensionPointStorageContextMock => {
  const extensionPointStorage = new ExtensionPointStorage(logger);

  const exceptionPreCreate: ExtensionPointStorageContextMock['exceptionPreCreate'] = {
    callback: jest.fn(async (data) => {
      return {
        ...data,
        name: `${data.name}-1`,
      };
    }),
    type: 'exceptionsListPreCreateItem',
  };

  const exceptionPreUpdate: ExtensionPointStorageContextMock['exceptionPreUpdate'] = {
    callback: jest.fn(async (data) => {
      return {
        ...data,
        name: `${data.name}-1`,
      };
    }),
    type: 'exceptionsListPreUpdateItem',
  };

  extensionPointStorage.add(exceptionPreCreate);
  extensionPointStorage.add(exceptionPreUpdate);

  return {
    exceptionPreCreate,
    exceptionPreUpdate,
    extensionPointStorage,
    logger,
  };
};
