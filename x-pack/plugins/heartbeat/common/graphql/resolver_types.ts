/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type HBResolverResult<T> = Promise<T> | T;

export type HBResolver<Result, Parent, Args, Context> = (
  parent: Parent,
  args: Args,
  context: Context
) => HBResolverResult<Result>;
