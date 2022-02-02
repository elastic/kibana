/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'kibana/server';

import type {
  ExtensionPoint,
  ExtensionPointCallbackDataArgument,
  ExtensionPointStorageClientInterface,
  ExtensionPointStorageInterface,
  NarrowExtensionPointToType,
  ServerExtensionCallbackContext,
} from './types';
import { ExtensionPointError } from './errors';

export class ExtensionPointStorageClient implements ExtensionPointStorageClientInterface {
  constructor(
    private readonly storage: ExtensionPointStorageInterface,
    private readonly logger: Logger
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
   * @param callbackContext
   * @param callbackResponseValidator A function to validate the returned data from an extension point callback
   */
  async pipeRun<
    T extends ExtensionPoint['type'],
    D extends NarrowExtensionPointToType<T> = NarrowExtensionPointToType<T>,
    P extends Parameters<D['callback']> = Parameters<D['callback']>
  >(
    extensionType: T,
    initialCallbackInput: P[0]['data'],
    callbackContext: ServerExtensionCallbackContext,
    callbackResponseValidator?: (data: P[0]['data']) => Error | undefined
  ): Promise<P[0]['data']> {
    let inputArgument = initialCallbackInput;
    const externalExtensions = this.get(extensionType);

    if (!externalExtensions || externalExtensions.size === 0) {
      return inputArgument;
    }

    for (const externalExtension of externalExtensions) {
      const extensionRegistrationSource =
        this.storage.getExtensionRegistrationSource(externalExtension);

      inputArgument = await externalExtension.callback({
        context: callbackContext,
        data: inputArgument as ExtensionPointCallbackDataArgument,
      });

      if (callbackResponseValidator) {
        // Before calling the next one, make sure the returned payload is valid
        const validationError = callbackResponseValidator(inputArgument);

        if (validationError) {
          this.logger.error(
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
