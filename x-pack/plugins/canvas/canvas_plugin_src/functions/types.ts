/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { functions } from '../functions/common';

// COMMON TYPES
// ------------
type CanvasFunctionType =
  | 'boolean'
  | 'datatable'
  | 'filter'
  | 'null'
  | 'number'
  | 'render'
  | 'string'
  | 'style';

/**
 * Utility type for converting a union of types into an intersection.
 *
 * This is a bit of "black magic" that will interpret a Union type as an Intersection
 * type.  This is necessary in this case of distiguishing one collection from
 * another in `FunctionError` and `FunctionStrings`.
 */
// prettier-ignore
export type UnionToIntersection<U> = 
  (U extends any ? (k: U) => void : never) extends ((k: infer I) => void) ? I : never;

/**
 * Utility type: gathers values of a collection as a type for use as a type.
 */
export type ValuesOf<T extends any[]> = T[number];

/**
 * Represents an object that is intended to be rendered.
 */
export interface Render<T> {
  type: 'render';
  as: string;
  value: T;
}

/**
 * Represents an object that is a Filter.
 */
export interface Filter {
  type?: string;
  value?: string;
  column?: string;
  and: Filter[];
  to?: string;
  from?: string;
}

/**
 * Represents an object that contains style information, typically CSS.
 */
export interface Style {
  spec: {
    fill: string;
    color: string;
  };
}

/**
 * Represents an object containing style information for a Container.
 */
export interface ContainerStyle {
  border: string | null;
  borderRadius: string | null;
  padding: string | null;
  backgroundColor: string | null;
  backgroundImage: string | null;
  backgroundSize: 'contain' | 'cover' | 'auto';
  backgroundRepeat: 'repeat-x' | 'repeat' | 'space' | 'round' | 'no-repeat' | 'space';
  opacity: number | null;
  overflow: 'visible' | 'hidden' | 'scroll' | 'auto';
}

/**
 * Represents a function called by the `case` Function.
 */
export type CaseType = () => Promise<{ matches: any; result: any }>;

// DATATABLES
// ----------

/**
 * This type represents the `type` of any `DatatableColumn` in a `Datatable`.
 */
export type DatatableColumnType = 'string' | 'number' | 'boolean' | 'date' | 'null';

/**
 * This type represents the shape of a column in a `Datatable`.
 */
export interface DatatableColumn {
  name: string;
  type: DatatableColumnType;
}

/**
 * A `Datatable` in Canvas is a unique structure that represents tabulated data.
 */
export interface Datatable {
  columns: DatatableColumn[];
  rows: any[];
  type: 'datatable';
}

/**
 * A Utility function that Typescript can use to determine if an object is a Datatable.
 * @param datatable
 */
export const isDatatable = (datatable: any): datatable is Datatable =>
  !!datatable && datatable.type === 'datatable';

// ARGUMENTS
// ---------

// Map the type of the generic to a Canvas string-based representation of the type.
// prettier-ignore
type TypeToCanvasArgument<T> = 
  T extends string ? 'string' : 
  T extends boolean ? 'boolean' : 
  T extends number ? 'number' :
  T extends Filter ? 'filter' :
  T extends CaseType ? 'case' :
  T extends ContainerStyle ? 'containerStyle' :
  T extends Render<any> ? 'render' :
  T extends Style ? 'style' :
  T extends Datatable ? 'datatable' :
  T extends null ? 'null' :
  never;

// If the argument type extends a Promise, we still need to return the string
// representation:
//
// `someArgument: Promise<boolean | string>` results in `types: ['boolean', 'string']`
//
type CanvasArgument<T> = T extends Promise<infer P>
  ? TypeToCanvasArgument<P>
  : TypeToCanvasArgument<T>;

// Types used in Canvas Arguments that don't map to a primitive cleanly:
//
// `date` is typed as a number or string, and represents a date
//
type UnmappedCanvasArgument = 'date' | 'null';

// Map the type within the the generic array to a Canvas string-based
// representation of the type.
// prettier-ignore
type ArrayTypeToCanvasArgument<T> = 
  T extends Array<infer ElementType> ? CanvasArgument<ElementType> : 
  T extends null ? 'null' : 
  never;

// Map the return type of the function within the generic to a Canvas
// string-based representation of the return type.
// prettier-ignore
type UnresolvedTypeToCanvasArgument<T> = 
  T extends (...args: any) => infer ElementType ? CanvasArgument<ElementType> : 
  T extends CaseType[] ? TypeToCanvasArgument<CaseType> : // TODO: this is an escape hatch and may be a simplified
  T extends null ? 'null' : 
  never;

// Map the array-based return type of the function within the generic to a
// Canvas string-based representation of the return type.
// prettier-ignore
type UnresolvedArrayTypeToCanvasArgument<T> = 
  T extends Array<(...args: any) => infer ElementType> ? CanvasArgument<ElementType> :
  T extends (...args: any) => infer ElementType ? ArrayTypeToCanvasArgument<ElementType> : 
  T extends null ? 'null' : 
  never;

// A type containing properties common to all Function Arguments.
interface BaseArgumentType<T> {
  aliases?: string[];
  help: string;
  options?: T[];
  required?: boolean;
  resolve?: boolean;
  types?: string[];
}

// The `types` array in a `FunctionSpec` should contain string
// representations of the `ArgumentsSpec` types:
//
// `someArgument: boolean | string` results in `types: ['boolean', 'string']`
//
type SingleArgumentType<T> = BaseArgumentType<T> & {
  multi?: false;
  resolve?: true;
  types?: Array<TypeToCanvasArgument<T> | UnmappedCanvasArgument>;
};

// If the `multi` property on the argument is true, the `types` array should
// contain string representations of the `ArgumentsSpec` array types:
//
// `someArgument: boolean[] | string[]` results in: `types: ['boolean', 'string']`
//
type MultipleArgumentType<T> = BaseArgumentType<T> & {
  multi: true;
  resolve?: true;
  types?: Array<ArrayTypeToCanvasArgument<T> | UnmappedCanvasArgument>;
};

// If the `resolve` property on the arugument is false, the `types` array, if
// present, should contain string representations of the result of the argument
// function:
//
// `someArgument: () => string` results in `types: ['string']`
//
type UnresolvedSingleArgumentType<T> = BaseArgumentType<T> & {
  options?: T[];
  resolve: false;
  types?: Array<UnresolvedTypeToCanvasArgument<T> | UnmappedCanvasArgument>;
};

// If the `resolve` property on the arugument is false, the `types` array, if
// present, should contain string representations of the result of the argument
// function:
//
// `someArgument: () => string[]` results in `types: ['string']`
//
type UnresolvedMultipleArgumentType<T> = BaseArgumentType<T> & {
  multi: true;
  resolve: false;
  types?: Array<UnresolvedArrayTypeToCanvasArgument<T> | UnmappedCanvasArgument>;
};

/**
 * This type represents all of the possible combinations of properties of an
 * Argument in a Canvas Function.  Certain fields influence the shape and
 * presence of others in each `arg`.
 */
export type ArgumentType<T> =
  | UnresolvedMultipleArgumentType<T>
  | UnresolvedSingleArgumentType<T>
  | MultipleArgumentType<T>
  | SingleArgumentType<T>;

// FUNCTIONS
// --------

/**
 * A basic Function specification; other Function specifications are based on
 * this interface.  It assumes the Function accepts any Context provided to it.
 */
interface FunctionSpec<Name, Arguments, Return> {
  args: { [key in keyof Arguments]: ArgumentType<Arguments[key]> };
  help: string;
  name: Name;
  type?: CanvasFunctionType | Name;
  fn(context: any, args: Arguments): Return;
}

/**
 * A Function spec requires a Context be provided, of a specifict type.
 */
interface ContextualFunctionSpec<Name, Context, Arguments, Return>
  extends FunctionSpec<Name, Arguments, Return> {
  context?: {
    types: Array<TypeToCanvasArgument<Context> | UnmappedCanvasArgument>;
  };
  fn(context: Context, args: Arguments): Return;
}

/**
 * A `FunctionFactory` defines the function that produces a named FunctionSpec.
 */
// prettier-ignore
export type FunctionFactory<Name extends string, Arguments, Return> = 
  () => FunctionSpec<Name, Arguments, Return>;

/**
 * A `ContextFunctionFactory` defines the function that produces a named FunctionSpec
 * which includes a Context.
 */
// prettier-ignore
export type ContextFunctionFactory<Name extends string, Context, Arguments, Return> = 
    () => ContextualFunctionSpec<Name, Context, Arguments, Return>;

/**
 * A `NullContextualFunctionFactory` defines the function that produces a named FunctionSpec
 * which includes an always-null Context.
 */
// prettier-ignore
export type NullContextFunctionFactory<Name extends string, Arguments, Return> = 
    () => ContextualFunctionSpec<Name, null, Arguments, Return>;

/**
 * A type which infers all of the Function names.
 */
// prettier-ignore
export type AvailableFunctions<FnFactory> = 
  FnFactory extends ContextFunctionFactory<infer Name, infer Context, infer Arguments, infer Return> ?
    { name: Name, context: Context, arguments: Arguments, return: Return } :
  FnFactory extends NullContextFunctionFactory<infer Name, infer Arguments, infer Return> ?
    { name: Name, arguments: Arguments, return: Return } :
  FnFactory extends FunctionFactory<infer Name, infer Arguments, infer Return> ?
    { name: Name, arguments: Arguments, return: Return } :
    never;

/**
 * A type containing all of the Function names available to Canvas, formally exported.
 */
export type AvailableFunctionNames = AvailableFunctions<typeof functions[number]>['name'];
