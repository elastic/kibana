/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable max-classes-per-file */

import type { Logger } from 'kibana/server';

import { ExtensionPoint } from './types';
import { ExtensionPointError } from './errors';

type NarrowExtensionPointToType<T extends ExtensionPoint['type']> = { type: T } & ExtensionPoint;

export class ExtensionPointStorage {
  private readonly store = new Map<ExtensionPoint['type'], Set<ExtensionPoint>>();
  private readonly registeredFrom = new Map<ExtensionPoint, string>();

  constructor(private readonly logger?: Logger) {}

  add(extension: ExtensionPoint): void {
    if (!this.store.has(extension.type)) {
      this.store.set(extension.type, new Set());
    }

    const extensionPointsForType = this.store.get(extension.type);

    if (extensionPointsForType) {
      extensionPointsForType.add(extension);

      // Capture stack trace from where this extension point was registered, so that it can be used when
      // errors occur or callbacks don't return the expected result
      const from = new Error('REGISTERED FROM:').stack ?? 'REGISTERED FROM: unknown';
      this.registeredFrom.set(
        extension,
        from.substring(from.indexOf('REGISTERED FROM:')).concat('\n    ----------------------')
      );
    }
  }

  clear(): void {
    this.store.clear();
    this.registeredFrom.clear();
  }

  getExtensionRegistrationSource(extensionPoint: ExtensionPoint): string | undefined {
    return this.registeredFrom.get(extensionPoint);
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
    return new ExtensionPointStorageClient(this, this.logger);
  }
}

export class ExtensionPointStorageClient {
  constructor(
    private readonly storage: ExtensionPointStorageInterface,
    private readonly logger?: Logger
  ) {}

  /**
   * Retrieve a list (`Set`) of extension points that are registered for a given type
   * @param extensionType
   */
  get<T extends ExtensionPoint['type']>(
    extensionType: T
  ): Set<NarrowExtensionPointToType<T>> | undefined {
    return this.storage.get(extensionType);
  }

  /**
   * Runs a set of callbacks by piping the Response from one extension point callback to the next callback
   * and finally returning the last callback payload.
   *
   * @param extensionType
   * @param initialCallbackInput The initial argument given to the first extension point callback
   * @param callbackResponseValidator A function to validate the returned data from an extension point callback
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
    let inputArgument: P[0] = initialCallbackInput;
    const externalExtensions = this.get(extensionType);

    if (!externalExtensions || externalExtensions.size === 0) {
      return inputArgument;
    }

    for (const externalExtension of externalExtensions) {
      const extensionRegistrationSource =
        this.storage.getExtensionRegistrationSource(externalExtension);

      try {
        // FIXME:PT investigate if we can avoid the TS ignore below?
        // @ts-expect-error
        inputArgument = await externalExtension.callback(inputArgument);
      } catch (error) {
        // Log the error that the external callback threw and keep going with the running of others
        this.logger?.error(
          new ExtensionPointError(
            `Extension point execution error for ${externalExtension.type}: ${extensionRegistrationSource}`
          )
        );
      }

      if (callbackResponseValidator) {
        // Before calling the next one, make sure the returned payload is valid
        const validationError = callbackResponseValidator(inputArgument);

        if (validationError) {
          this.logger?.error(
            new ExtensionPointError(
              `Extension point for ${externalExtension.type} returned data that failed validation: ${extensionRegistrationSource}`,
              {
                validationError,
              }
            )
          );

          throw validationError;
        }
      }
    }

    return inputArgument;
  }
}

export type ExtensionPointStorageInterface = ExtensionPointStorage;
export type ExtensionPointStorageClientInterface = ExtensionPointStorageClient;
