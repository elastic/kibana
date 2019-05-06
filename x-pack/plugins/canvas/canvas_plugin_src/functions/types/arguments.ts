/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  Filter,
  Case,
  ContainerStyle,
  Render,
  Style,
  Datatable,
  PointSeries,
  Palette,
  SeriesStyle,
} from '.';
import { AxisConfig } from './common';

/**
 * This type can convert a type into a known Canvas Argument string.  For example,
 * `TypeToCanvasArgument<Datatable>` will resolve to `'datatable'`.  This allows
 * Canvas Functions to continue top specify their type in a simple string format.
 */
export type TypeToCanvasArgument<T> = KnownTypeToCanvasArgument<T> | UnmappedCanvasArgument;

/**
 * This type represents all of the possible combinations of properties of an
 * Argument in a Canvas Function.  The presence or absencse of certain fields
 * influence the shape and presence of others within each `arg` in the specification.
 */
export type ArgumentType<T> =
  | SingleArgumentType<T>
  | MultipleArgumentType<T>
  | UnresolvedSingleArgumentType<T>
  | UnresolvedMultipleArgumentType<T>;

// Map the type of the generic to a Canvas string-based representation of the type.
// prettier-ignore
type KnownTypeToCanvasArgument<T> = 
  T extends string ? 'string' : 
  T extends boolean ? 'boolean' : 
  T extends number ? 'number' :
  T extends AxisConfig ? 'axisConfig' :
  T extends Filter ? 'filter' :
  T extends Case ? 'case' :
  T extends ContainerStyle ? 'containerStyle' :
  T extends Render<any> ? 'render' :
  T extends Style ? 'style' :
  T extends Datatable ? 'datatable' :
  T extends PointSeries ? 'pointseries' :
  T extends Palette ? 'palette' :
  T extends SeriesStyle ? 'seriesStyle' :
  T extends null ? 'null' :
  never;

// If the argument type extends a Promise, we still need to return the string
// representation:
//
// `someArgument: Promise<boolean | string>` results in `types: ['boolean', 'string']`
//
type CanvasArgument<T> = T extends Promise<infer P>
  ? KnownTypeToCanvasArgument<P>
  : KnownTypeToCanvasArgument<T>;

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
  /** Alternate names for the Function valid for use in the Expression Editor */
  aliases?: string[];
  /** Help text for the Argument to be displayed in the Expression Editor */
  help: string;
  /** Default options for the Argument */
  options?: T[];
  /**
   * Is this Argument required?
   * @default false
   */
  required?: boolean;
  /**
   * If false, the Argument is supplied as a function to be invoked in the
   * implementation, rather than a value.
   * @default true
   */
  resolve?: boolean;
  /** Names of types that are valid values of the Argument. */
  types?: string[];
  /** The optional default value of the Argument. */
  default?: T | string;
  /**
   * If true, multiple values may be supplied to the Argument.
   * @default false
   */
  multi?: boolean;
}

// The `types` array in a `FunctionSpec` should contain string
// representations of the `ArgumentsSpec` types:
//
// `someArgument: boolean | string` results in `types: ['boolean', 'string']`
//
type SingleArgumentType<T> = BaseArgumentType<T> & {
  multi?: false;
  resolve?: true;
  types?: Array<KnownTypeToCanvasArgument<T> | UnmappedCanvasArgument>;
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
  multi?: false;
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
