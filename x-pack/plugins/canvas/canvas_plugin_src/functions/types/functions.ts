/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ArgumentType, TypeToCanvasArgument } from './arguments';
import { functions as commonFunctions } from '../../functions/common';
import { functions as browserFunctions } from '../../functions/browser';
import { functions as serverFunctions } from '../../functions/server';

/**
 * A Function type which represents a Function in Canvas.  This type assumes
 * any Context can be provided and used by the Function implementation.
 */
export interface Function<Name extends string, Arguments, Return> {
  /** Arguments for the Function */
  args: { [key in keyof Arguments]: ArgumentType<Arguments[key]> };
  aliases?: string[];
  /** Help text displayed in the Expression editor */
  help: string;
  /** The name of the Function */
  name: Name;
  /** The type of the Function */
  type?: CanvasFunctionType | Name;
  /** The implementation of the Function */
  fn(context: any, args: Arguments, handlers: FunctionHandlers): Return;
}

/**
 * A Function type which restricts the incoming Context to a specific type.
 */
export interface ContextFunction<Name extends string, Context, Arguments, Return>
  extends Function<Name, Arguments, Return> {
  /** The incoming Context provided to the Function; the information piped in. */
  context?: {
    types: Array<TypeToCanvasArgument<Context>>;
  };
  /** The implementation of the Function */
  fn(context: Context, args: Arguments, handlers: FunctionHandlers): Return;
}

/**
 * A Function type which restricts the incoming Context specifically to `null`.
 */
export interface NullContextFunction<Name extends string, Arguments, Return>
  extends ContextFunction<Name, null, Arguments, Return> {
  /** The incoming Context provided to the Function; the information piped in. */
  context?: {
    types: ['null'];
  };
  /** The implementation of the Function */
  fn(context: null, args: Arguments, handlers: FunctionHandlers): Return;
}

// A reducing type for Function Factories to a base `Function`.
// This is useful for collecting all of the Functions and the concepts they share as
// one useable type.
// prettier-ignore
type FunctionFactories<FnFactory> = 
  FnFactory extends ContextFunctionFactory<infer Name, infer Context, infer Arguments, infer Return> ?
    Function<Name, Arguments, Return> :
  FnFactory extends NullContextFunctionFactory<infer Name, infer Arguments, infer Return> ?
    Function<Name, Arguments, Return> :
  FnFactory extends FunctionFactory<infer Name, infer Arguments, infer Return> ?
    Function<Name, Arguments, Return> :
  never;

/**
 * A type containing all available Functions.
 */
export type AvailableFunctions = FunctionFactories<Functions>;

/**
 * A type containing all of the Function names available to Canvas, formally exported.
 */
// prettier-ignore
export type AvailableFunctionNames = AvailableFunctions['name'];

// A type containing all of the raw Function definitions in Canvas.
// prettier-ignore
type Functions = 
  typeof commonFunctions[number] &
  typeof browserFunctions[number] &
  typeof serverFunctions[number];

// A union of strings representing Canvas Function "types". This is used in the `type` field
// of the Function specification.  We may refactor this to be a known type, rather than a
// union of strings.
type CanvasFunctionType =
  | 'boolean'
  | 'datatable'
  | 'filter'
  | 'null'
  | 'number'
  | 'render'
  | 'string'
  | 'style';

// Handlers can be passed to the `fn` property of the Function.  At the moment, these Functions
// are not strongly defined.
interface FunctionHandlers {
  [key: string]: (...args: any) => any;
}

// A `FunctionFactory` defines the function that produces a named FunctionSpec.
// prettier-ignore
type FunctionFactory<Name extends string, Arguments, Return> = 
  () => Function<Name, Arguments, Return>;

// A `ContextFunctionFactory` defines the function that produces a named FunctionSpec
// which includes a Context.
// prettier-ignore
type ContextFunctionFactory<Name extends string, Context, Arguments, Return> = 
    () => ContextFunction<Name, Context, Arguments, Return>;

// A `NullContextualFunctionFactory` defines the function that produces a named FunctionSpec
// which includes an always-null Context.
// prettier-ignore
type NullContextFunctionFactory<Name extends string, Arguments, Return> = 
    () => ContextFunction<Name, null, Arguments, Return>;
