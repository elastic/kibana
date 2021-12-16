/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line max-classes-per-file
import { ExtensionPoint, ServerExtensionCallback } from './types';

export class ExtensionPointStorage {
  private readonly store = new Map<ExtensionPoint['type'], Set<ServerExtensionCallback>>();

  add(extension: ExtensionPoint): void {
    if (!this.store.has(extension.type)) {
      this.store.set(extension.type, new Set());
    }

    const extensionPointCallbacks = this.store.get(extension.type);

    if (extensionPointCallbacks) {
      // FIXME:PT store the entire definition? ALso, capture (via Error#stack) where the extension was added from (debug purposes)

      extensionPointCallbacks.add(extension.callback);
    }
  }

  clear(): void {
    this.store.clear();
  }

  get(extensionType: ExtensionPoint['type']): Set<ServerExtensionCallback> | undefined {
    return this.store.get(extensionType);
  }

  /**
   * returns a client interface that does not expose the full set of methods available in the storage
   */
  getClient(): ExtensionPointStorageClientInterface {
    return new ExtensionPointStorageClient(this);
  }
}

class ExtensionPointStorageClient {
  constructor(private readonly storage: ExtensionPointStorageInterface) {}

  /**
   * Retrieve a list (`Set`) of extension points that are registered for a given type
   * @param extensionType
   */
  get(
    extensionType: ExtensionPoint['type']
  ): ReadonlySet<Readonly<ServerExtensionCallback>> | undefined {
    return this.storage.get(extensionType);
  }
}

export type ExtensionPointStorageInterface = ExtensionPointStorage;
export type ExtensionPointStorageClientInterface = ExtensionPointStorageClient;
