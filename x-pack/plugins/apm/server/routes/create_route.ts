/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RouteFactoryFn, HttpMethod, Params } from './typings';

export function createRoute<
  TName extends string,
  TReturn,
  TMethod extends HttpMethod = 'GET',
  TParams extends Params = {}
>(fn: RouteFactoryFn<TName, TMethod, TParams, TReturn>) {
  return fn;
}
