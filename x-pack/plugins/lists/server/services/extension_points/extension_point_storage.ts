/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExtensionPoint, ServerExtensionCallback } from './types';

export class ExtensionPointStorage {
  private readonly store = new Map<ExtensionPoint['type'], Set<ServerExtensionCallback>>();

  add(extension: ExtensionPoint): void {
    if (!this.store.has(extension.type)) {
      this.store.set(extension.type, new Set());
    }

    const extensionPointCallbacks = this.store.get(extension.type);

    if (extensionPointCallbacks) {
      extensionPointCallbacks.add(extension.callback);
    }
  }

  clear(): void {
    this.store.clear();
  }

  get(extensionType: ExtensionPoint['type']): Set<ServerExtensionCallback> | undefined {
    return this.store.get(extensionType);
  }
}

export type ExtensionPointStorageInterface = ExtensionPointStorage;
