/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UnionToIntersection } from '@kbn/utility-types';
import { KibanaRequest } from 'kibana/server';

import {
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from '../exception_lists/exception_list_client_types';

/**
 * The `this` context provided to extension point's callback function
 * NOTE: in order to access this context, callbacks **MUST** be defined using `function()` instead of arrow functions.
 */
export interface ServerExtensionCallbackContext {
  /**
   * The Lists plugin HTTP Request. May be undefined if the callback is executed from a area of code that
   * is not triggered via one of the HTTP handlers
   */
  request?: KibanaRequest;
}

export type ServerExtensionCallback<A extends object | void = void, R = A> = (args: {
  context: ServerExtensionCallbackContext;
  data: A;
}) => Promise<R>;

interface ServerExtensionPointDefinition<
  T extends string,
  Args extends object | void = void,
  Response = Args
> {
  type: T;
  /**
   * The callback that will be executed at the given extension point. The Function will be provided a context (`this)`
   * that includes supplemental data associated with its type. In order to access that data, the callback **MUST**
   * be defined using `function()` and NOT an arrow function.
   *
   * @example
   *
   * {
   *   type: 'some type',
   *   callback: function() {
   *     // this === context is available
   *   }
   * }
   */
  callback: ServerExtensionCallback<Args, Response>;
}

/**
 * Extension point is triggered prior to creating a new Exception List Item. Throw'ing will cause
 * the create operation to fail
 */
export type ExceptionsListPreCreateItemServerExtension = ServerExtensionPointDefinition<
  'exceptionsListPreCreateItem',
  CreateExceptionListItemOptions
>;

/**
 * Extension point is triggered prior to updating the Exception List Item. Throw'ing will cause the
 * update operation to fail
 */
export type ExceptionsListPreUpdateItemServerExtension = ServerExtensionPointDefinition<
  'exceptionsListPreUpdateItem',
  UpdateExceptionListItemOptions
>;

export type ExtensionPoint =
  | ExceptionsListPreCreateItemServerExtension
  | ExceptionsListPreUpdateItemServerExtension;

/**
 * A Map of extension point type and associated Set of callbacks
 */
/**
 * Registration function for server-side extension points
 */
export type ListsServerExtensionRegistrar = (extension: ExtensionPoint) => void;

export type NarrowExtensionPointToType<T extends ExtensionPoint['type']> = {
  type: T;
} & ExtensionPoint;

/**
 * An intersection of all callback arguments for use internally when
 * casting (ex. in `ExtensionPointStorageClient#pipeRun()`
 */
export type ExtensionPointCallbackDataArgument = UnionToIntersection<
  Parameters<ExtensionPoint['callback']>[0]['data']
>;

export interface ExtensionPointStorageClientInterface {
  get<T extends ExtensionPoint['type']>(
    extensionType: T
  ): Set<NarrowExtensionPointToType<T>> | undefined;

  pipeRun<
    T extends ExtensionPoint['type'],
    D extends NarrowExtensionPointToType<T> = NarrowExtensionPointToType<T>,
    P extends Parameters<D['callback']> = Parameters<D['callback']>
  >(
    extensionType: T,
    initialCallbackInput: P[0]['data'],
    callbackContext: ServerExtensionCallbackContext,
    callbackResponseValidator?: (data: P[0]['data']) => Error | undefined
  ): Promise<P[0]['data']>;
}

export interface ExtensionPointStorageInterface {
  add(extension: ExtensionPoint): void;

  clear(): void;

  getExtensionRegistrationSource(extensionPoint: ExtensionPoint): string | undefined;

  get<T extends ExtensionPoint['type']>(
    extensionType: T
  ): Set<NarrowExtensionPointToType<T>> | undefined;

  getClient(): ExtensionPointStorageClientInterface;
}
