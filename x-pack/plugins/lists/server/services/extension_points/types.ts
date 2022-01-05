/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PromiseType } from 'utility-types';
import { UnionToIntersection } from '@kbn/utility-types';

import {
  CreateExceptionListItemOptions,
  UpdateExceptionListItemOptions,
} from '../exception_lists/exception_list_client_types';

export type ServerExtensionCallback<A extends object | void = void, R = unknown> = (
  args: A
) => Promise<R>;

interface ServerExtensionPointDefinition<
  T extends string,
  Args extends object | void = void,
  Response = void
> {
  type: T;
  callback: ServerExtensionCallback<Args, Response>;
}

/**
 * Extension point is triggered prior to creating a new Exception List Item. Throw'ing will cause
 * the create operation to fail
 */
export type ExceptionsListPreCreateItemServerExtension = ServerExtensionPointDefinition<
  'exceptionsListPreCreateItem',
  CreateExceptionListItemOptions,
  CreateExceptionListItemOptions
>;

/**
 * Extension point is triggered prior to updating the Exception List Item. Throw'ing will cause the
 * update operation to fail
 */
export type ExceptionListPreUpdateItemServerExtension = ServerExtensionPointDefinition<
  'exceptionsListPreUpdateItem',
  UpdateExceptionListItemOptions,
  UpdateExceptionListItemOptions
>;

export type ExtensionPoint =
  | ExceptionsListPreCreateItemServerExtension
  | ExceptionListPreUpdateItemServerExtension;

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
export type ExtensionPointCallbackArgument = UnionToIntersection<
  PromiseType<ReturnType<ExtensionPoint['callback']>>
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
    initialCallbackInput: P[0],
    callbackResponseValidator?: (data: P[0]) => Error | undefined
  ): Promise<P[0]>;
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
