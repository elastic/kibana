/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
