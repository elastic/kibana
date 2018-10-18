/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLResolveInfo } from 'graphql';

type BasicResolver<Result, Args = any> = (
  parent: any,
  args: Args,
  context: any,
  info: GraphQLResolveInfo
) => Promise<Result> | Result;

type InfraResolverResult<R> =
  | Promise<R>
  | Promise<{ [P in keyof R]: () => Promise<R[P]> }>
  | { [P in keyof R]: () => Promise<R[P]> }
  | { [P in keyof R]: () => R[P] }
  | R;

export type InfraResolvedResult<Resolver> = Resolver extends InfraResolver<
  infer Result,
  any,
  any,
  any
>
  ? Result
  : never;

export type SubsetResolverWithFields<R, IncludedFields extends string> = R extends BasicResolver<
  Array<infer ResultInArray>,
  infer ArgsInArray
>
  ? BasicResolver<
      Array<Pick<ResultInArray, Extract<keyof ResultInArray, IncludedFields>>>,
      ArgsInArray
    >
  : R extends BasicResolver<infer Result, infer Args>
    ? BasicResolver<Pick<Result, Extract<keyof Result, IncludedFields>>, Args>
    : never;

export type SubsetResolverWithoutFields<R, ExcludedFields extends string> = R extends BasicResolver<
  Array<infer ResultInArray>,
  infer ArgsInArray
>
  ? BasicResolver<
      Array<Pick<ResultInArray, Exclude<keyof ResultInArray, ExcludedFields>>>,
      ArgsInArray
    >
  : R extends BasicResolver<infer Result, infer Args>
    ? BasicResolver<Pick<Result, Exclude<keyof Result, ExcludedFields>>, Args>
    : never;

export type InfraResolver<Result, Parent, Args, Context> = (
  parent: Parent,
  args: Args,
  context: Context,
  info: GraphQLResolveInfo
) => InfraResolverResult<Result>;

export type InfraResolverOf<Resolver, Parent, Context> = Resolver extends BasicResolver<
  infer Result,
  infer Args
>
  ? InfraResolver<Result, Parent, Args, Context>
  : never;

export type InfraResolverWithFields<
  Resolver,
  Parent,
  Context,
  IncludedFields extends string
> = InfraResolverOf<SubsetResolverWithFields<Resolver, IncludedFields>, Parent, Context>;

export type InfraResolverWithoutFields<
  Resolver,
  Parent,
  Context,
  ExcludedFields extends string
> = InfraResolverOf<SubsetResolverWithoutFields<Resolver, ExcludedFields>, Parent, Context>;
