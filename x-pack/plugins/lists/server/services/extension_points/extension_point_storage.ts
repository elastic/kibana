/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import { ExtensionPoint } from './types';

type NarrowExtensionPointToType<T extends ExtensionPoint['type']> = ExtensionPoint & { type: T };

export class ExtensionPointStorage {
  private readonly store = new Map<ExtensionPoint['type'], Set<ExtensionPoint>>();

  add(extension: ExtensionPoint): void {
    if (!this.store.has(extension.type)) {
      this.store.set(extension.type, new Set());
    }

    const extensionPointCallbacks = this.store.get(extension.type);

    if (extensionPointCallbacks) {
      // FIXME:PT should we capture (via Error#stack) where the extension was added from (debug purposes)

      extensionPointCallbacks.add(extension);
    }
  }

  clear(): void {
    this.store.clear();
  }

  get<T extends ExtensionPoint['type']>(
    extensionType: T
  ): Set<NarrowExtensionPointToType<T>> | undefined {
    const extensionDefinitions = this.store.get(extensionType);

    if (extensionDefinitions) {
      return extensionDefinitions as Set<NarrowExtensionPointToType<T>>;
    }

    return undefined;
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
  get<T extends ExtensionPoint['type']>(
    extensionType: T
  ): ReturnType<ExtensionPointStorageInterface['get']> {
    return this.storage.get(extensionType);
  }

  /**
   * Runs a set of callbacks by piping the Response from one extension point callback to the next callback
   * and finally returning the last callback payload.
   *
   * @param extensionType
   * @param initialCallbackInput
   * @param callbackResponseValidator
   */
  async pipeRun<
    T extends ExtensionPoint['type'],
    D extends NarrowExtensionPointToType<T> = NarrowExtensionPointToType<T>,
    P extends Parameters<D['callback']> = Parameters<D['callback']>
  >(
    extensionType: T,
    initialCallbackInput: P[0],
    callbackResponseValidator?: (data: P[0]) => Error | undefined
  ): Promise<P[0]> {
    let inputArgument = initialCallbackInput;
    const externalExtensions = this.get(extensionType);

    if (!externalExtensions || externalExtensions.size === 0) {
      return inputArgument;
    }

    for (const externalExtension of externalExtensions) {
      inputArgument = await externalExtension.callback(inputArgument);

      if (callbackResponseValidator) {
        // Before calling the next one, make sure the returned payload is valid
        const validationError = callbackResponseValidator(inputArgument);

        if (validationError) {
          throw validationError;
        }
      }
    }

    return inputArgument;
  }
}

export type ExtensionPointStorageInterface = ExtensionPointStorage;
export type ExtensionPointStorageClientInterface = ExtensionPointStorageClient;
