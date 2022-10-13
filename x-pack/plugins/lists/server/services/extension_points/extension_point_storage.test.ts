/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExceptionsListPreCreateItemServerExtension,
  ExtensionPointStorageInterface,
} from './types';
import { createExtensionPointStorageMock } from './extension_point_storage.mock';
import { ExtensionPointStorageClient } from './extension_point_storage_client';

describe('When using ExtensionPointStorage', () => {
  let storageService: ExtensionPointStorageInterface;
  let preCreateExtensionPointMock: ExceptionsListPreCreateItemServerExtension;

  beforeEach(() => {
    const storageContext = createExtensionPointStorageMock();

    storageService = storageContext.extensionPointStorage;
    preCreateExtensionPointMock = storageContext.exceptionPreCreate;
  });

  it('should be able to add() extension point and get() it', () => {
    storageService.add(preCreateExtensionPointMock);
    const extensionPointSet = storageService.get('exceptionsListPreCreateItem');

    expect(extensionPointSet?.size).toBe(1);
    expect(extensionPointSet?.has(preCreateExtensionPointMock)).toBe(true);
  });

  it('should return `undefined` on get() when no extension points are registered', () => {
    storageService.clear();
    expect(storageService.get('exceptionsListPreCreateItem')).toBeUndefined();
  });

  it('should capture `.stack` from where extension point was registered', () => {
    storageService.add(preCreateExtensionPointMock);

    expect(storageService.getExtensionRegistrationSource(preCreateExtensionPointMock)).toContain(
      'extension_point_storage.test'
    );
  });

  it('should clear() all extensions', () => {
    storageService.clear();

    expect(storageService.get('exceptionsListPreCreateItem')).toBeUndefined();
    expect(storageService.get('exceptionsListPreUpdateItem')).toBeUndefined();
  });

  it('should return a client', () => {
    expect(storageService.getClient()).toBeInstanceOf(ExtensionPointStorageClient);
  });
});
