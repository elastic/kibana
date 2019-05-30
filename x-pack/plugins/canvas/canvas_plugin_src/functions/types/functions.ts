/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ExpressionFunction } from 'src/legacy/core_plugins/interpreter/public';
import { functions as commonFunctions } from '../../functions/common';
import { functions as browserFunctions } from '../../functions/browser';
import { functions as serverFunctions } from '../../functions/server';

// A reducing type for Function Factories to a base `Function`.
// This is useful for collecting all of the Functions and the concepts they share as
// one useable type.
// prettier-ignore
export type FunctionFactory<FnFactory> = 
  FnFactory extends InterpreterFunctionFactory<infer Name, infer Context, infer Arguments, infer Return> ?
    ExpressionFunction<Name, Context, Arguments, Return> :
    never;

/**
 * A type containing all available Functions.
 */
export type AvailableFunctions = FunctionFactory<Functions>;

/**
 * A type containing all of the Function names available to Canvas, formally exported.
 */
// prettier-ignore
export type AvailableFunctionNames = AvailableFunctions['name'];

// A type containing all of the raw Function definitions in Canvas.
// prettier-ignore
type Functions = 
  typeof commonFunctions[number] &
  typeof serverFunctions[number] &
  typeof browserFunctions[number];

// A `InterpreterFunctionFactory` defines the function that produces a named FunctionSpec using
// the Interpreter type.
// prettier-ignore
type InterpreterFunctionFactory<Name extends string, Context, Arguments, Return> = 
  () => ExpressionFunction<Name, Context, Arguments, Return>;
