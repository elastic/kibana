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
  | 'number'
  | 'render'
  | 'string'
  | 'style'
  | 'null';

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

export interface Render<T> {
  type: 'render';
  as: string;
  value: T;
}

export interface Filter {
  type?: string;
  value?: string;
  column?: string;
  and: Filter[];
  to?: string;
  from?: string;
}

export interface Style {
  spec: {
    fill: string;
    color: string;
  };
}

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

export type Case = () => Promise<{ matches: any; result: any }>;

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

export const isDatatable = (datatable: any): datatable is Datatable =>
  datatable.type === 'datatable';

// ARGUMENTS
// ---------

// Map the type of the generic to a Canvas string-based representation of the type.
// prettier-ignore
type PrimitiveToCanvasArgument<T> = 
  T extends string ? 'string' : 
  T extends boolean ? 'boolean' : 
  T extends number ? 'number' :
  T extends Case ? 'case' :
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
// prettier-ignore
type CanvasArgument<ElementType> = 
  ElementType extends Promise<infer PromisedElementType> ? 
    PrimitiveToCanvasArgument<PromisedElementType> : 
    PrimitiveToCanvasArgument<ElementType>;

// Types used in Canvas Arguments that don't map to a primitive cleanly:
//
// `date` is typed as a number or string, and represents a date
// `style` is typed as a string, and represents a CSS inline style
//
type UnmappedCanvasArgument = 'filter' | 'seriesStyle' | 'date' | 'null';

// Map the type within the the generic array to a Canvas string-based
// representation of the type.
// prettier-ignore
type ArrayPrimitiveToCanvasArgument<T> = 
  T extends Array<infer ElementType> ? CanvasArgument<ElementType> : 
  T extends null ? 'null' : 
  never;

// Map the return type of the function within the generic to a Canvas
// string-based representation of the return type.
// prettier-ignore
type UnresolvedPrimitiveToCanvasArgument<T> = 
  T extends (...args: any) => infer ElementType ? CanvasArgument<ElementType> : 
  T extends Case[] ? PrimitiveToCanvasArgument<Case> : // TODO: this is an escape hatch and may be a simplified
  T extends null ? 'null' : 
  never;

// Map the array-based return type of the function within the generic to a
// Canvas string-based representation of the return type.
// prettier-ignore
type UnresolvedArrayPrimitiveToCanvasArgument<T> = 
  T extends Array<(...args: any) => infer ElementType> ? CanvasArgument<ElementType> :
  T extends (...args: any) => infer ElementType ? ArrayPrimitiveToCanvasArgument<ElementType> : 
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
  types?: Array<PrimitiveToCanvasArgument<T> | UnmappedCanvasArgument>;
};

// If the `multi` property on the argument is true, the `types` array should
// contain string representations of the `ArgumentsSpec` array types:
//
// `someArgument: boolean[] | string[]` results in: `types: ['boolean', 'string']`
//
type MultipleArgumentType<T> = BaseArgumentType<T> & {
  multi: true;
  resolve?: true;
  types?: Array<ArrayPrimitiveToCanvasArgument<T> | UnmappedCanvasArgument>;
};

// If the `resolve` property on the arugument is false, the `types` array, if
// present, should contain string representations of the result of the argument
// function:
//
// `someArgument: () => string` results in `types: ['string']`
//
type UnresolvedArgumentType<T> = BaseArgumentType<T> & {
  options?: T[];
  resolve: false;
  types?: Array<UnresolvedPrimitiveToCanvasArgument<T> | UnmappedCanvasArgument>;
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
  types?: Array<UnresolvedArrayPrimitiveToCanvasArgument<T> | UnmappedCanvasArgument>;
};

/**
 * This type represents all of the possible combinations of properties of an
 * Argument in a Canvas Function.  Certain fields influence the shape and
 * presence of others in each `arg`.
 */
export type ArgumentType<T> =
  | UnresolvedMultipleArgumentType<T>
  | UnresolvedArgumentType<T>
  | MultipleArgumentType<T>
  | SingleArgumentType<T>;

// FUNCTIONS
// --------

/**
 * Declare a Function Spec interface representing a Function. The generics for
 * `Name`, `ArgumentsSpec`, `Context` and `Errors` provide the interface with
 * information it needs to enforce those shapes:
 *
 * `Name`: string of the name of the Function within Canvas;
 * `Arguments`: a type containing Arguments and their types;
 * `Return`: a type indicating what `fn` will return;
 * `Context`: a type representing available incoming Context types;
 */
interface FunctionSpec<Name, Context, Arguments, Return> {
  args: { [key in keyof Arguments]: ArgumentType<Arguments[key]> };
  context?: {
    types: Array<PrimitiveToCanvasArgument<Context> | UnmappedCanvasArgument>;
  };
  fn(context: Context, args: Arguments): Return;
  help: string;
  name: Name;
  type?: CanvasFunctionType | Name;
}

/**
 * A `FunctionFactory` defines the function that produces a named FunctionSpec.
 */
// prettier-ignore
export type FunctionFactory<Name extends string, Context, Arguments, Return> = 
  () => FunctionSpec<Name, Context, Arguments, Return>;

/**
 * A type which infers all of the Function names.
 */
// prettier-ignore
export type AvailableFunctions<FnFactory> = 
  FnFactory extends FunctionFactory<infer Name, infer Context, infer Arguments, infer Return> ?
    { name: Name, context: Context, arguments: Arguments, return: Return } :
    never;

/**
 * A type containing all of the Function names available to Canvas, formally exported.
 */
export type AvailableFunctionNames = AvailableFunctions<typeof functions[number]>['name'];
