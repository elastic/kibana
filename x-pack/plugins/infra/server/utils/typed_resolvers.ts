/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Resolver } from '../graphql/types';

type ResolverResult<R> = R | Promise<R>;

type InfraResolverResult<R> =
  | Promise<R>
  | Promise<{ [P in keyof R]: () => Promise<R[P]> }>
  | { [P in keyof R]: () => Promise<R[P]> }
  | { [P in keyof R]: () => R[P] }
  | R;

export type ResultOf<Resolver_> = Resolver_ extends Resolver<InfraResolverResult<infer Result>>
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
  any,
  infer Context,
  infer Args
>
  ? Resolver<Result, Parent, Context, Args>
  : never;

export type InfraResolver<Result = any, Parent = any, Context = any, Args = any> = Resolver<
  InfraResolverResult<Result>,
  Parent,
  Context,
  Args
>;

export type InfraResolverOf<Resolver_> = Resolver_ extends Resolver<
  ResolverResult<infer ResultWithNeverParent>,
  never,
  infer ContextWithNeverParent,
  infer ArgsWithNeverParent
>
  ? InfraResolver<ResultWithNeverParent, {}, ContextWithNeverParent, ArgsWithNeverParent>
  : Resolver_ extends Resolver<
      ResolverResult<infer Result>,
      infer Parent,
      infer Context,
      infer Args
    >
  ? InfraResolver<Result, Parent, Context, Args>
  : never;

export type InfraResolverWithFields<Resolver_, IncludedFields extends string> = InfraResolverOf<
  SubsetResolverWithFields<Resolver_, IncludedFields>
>;

export type InfraResolverWithoutFields<Resolver_, ExcludedFields extends string> = InfraResolverOf<
  SubsetResolverWithoutFields<Resolver_, ExcludedFields>
>;

export type ChildResolverOf<Resolver_, ParentResolver> = ResolverWithParent<
  Resolver_,
  ResultOf<ParentResolver>
>;
