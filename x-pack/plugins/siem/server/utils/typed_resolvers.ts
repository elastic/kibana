/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Resolver } from '../graphql/types';

type ResolverResult<R> = R | Promise<R>;

type AppResolverResult<R> =
  | Promise<R>
  | Promise<{ [P in keyof R]: () => Promise<R[P]> }>
  | { [P in keyof R]: () => Promise<R[P]> }
  | { [P in keyof R]: () => R[P] }
  | R;

export type ResultOf<Resolver_> = Resolver_ extends Resolver<AppResolverResult<infer Result>>
  ? Result
  : never;

export type SubsetResolverWithFields<R, IncludedFields extends string> = R extends Resolver<
  Array<infer ResultInArray>,
  infer ParentInArray,
  infer ContextInArray,
  infer ArgsInArray
>
  ? Resolver<
      Array<Pick<ResultInArray, Extract<keyof ResultInArray, IncludedFields>>>,
      ParentInArray,
      ContextInArray,
      ArgsInArray
    >
  : R extends Resolver<infer Result, infer Parent, infer Context, infer Args>
  ? Resolver<Pick<Result, Extract<keyof Result, IncludedFields>>, Parent, Context, Args>
  : never;

export type SubsetResolverWithoutFields<R, ExcludedFields extends string> = R extends Resolver<
  Array<infer ResultInArray>,
  infer ParentInArray,
  infer ContextInArray,
  infer ArgsInArray
>
  ? Resolver<
      Array<Pick<ResultInArray, Exclude<keyof ResultInArray, ExcludedFields>>>,
      ParentInArray,
      ContextInArray,
      ArgsInArray
    >
  : R extends Resolver<infer Result, infer Parent, infer Context, infer Args>
  ? Resolver<Pick<Result, Exclude<keyof Result, ExcludedFields>>, Parent, Context, Args>
  : never;

export type ResolverWithParent<Resolver_, Parent> = Resolver_ extends Resolver<
  infer Result,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any,
  infer Context,
  infer Args
>
  ? Resolver<Result, Parent, Context, Args>
  : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AppResolver<Result = any, Parent = any, Context = any, Args = any> = Resolver<
  AppResolverResult<Result>,
  Parent,
  Context,
  Args
>;

export type AppResolverOf<Resolver_> = Resolver_ extends Resolver<
  ResolverResult<infer ResultWithNeverParent>,
  never,
  infer ContextWithNeverParent,
  infer ArgsWithNeverParent
>
  ? AppResolver<ResultWithNeverParent, {}, ContextWithNeverParent, ArgsWithNeverParent>
  : Resolver_ extends Resolver<
      ResolverResult<infer Result>,
      infer Parent,
      infer Context,
      infer Args
    >
  ? AppResolver<Result, Parent, Context, Args>
  : never;

export type AppResolverWithFields<Resolver_, IncludedFields extends string> = AppResolverOf<
  SubsetResolverWithFields<Resolver_, IncludedFields>
>;

export type AppResolverWithoutFields<Resolver_, ExcludedFields extends string> = AppResolverOf<
  SubsetResolverWithoutFields<Resolver_, ExcludedFields>
>;

export type ChildResolverOf<Resolver_, ParentResolver> = ResolverWithParent<
  Resolver_,
  ResultOf<ParentResolver>
>;
