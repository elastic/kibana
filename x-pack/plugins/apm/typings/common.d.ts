/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import '../../../legacy/plugins/infra/types/rison_node';
import '../../../legacy/plugins/infra/types/eui';
// EUIBasicTable
import '../../../legacy/plugins/reporting/public/components/report_listing';
// .svg
import '../../../legacy/plugins/canvas/types/webpack';

// Allow unknown properties in an object
export type AllowUnknownProperties<T> = T extends Array<infer X>
  ? Array<AllowUnknownObjectProperties<X>>
  : AllowUnknownObjectProperties<T>;

type AllowUnknownObjectProperties<T> = T extends object
  ? { [Prop in keyof T]: AllowUnknownProperties<T[Prop]> } & {
      [key: string]: unknown;
    }
  : T;

export type PromiseValueType<Value> = Value extends Promise<infer Value>
  ? Value
  : Value;

export type PromiseReturnType<Func> = Func extends (
  ...args: any[]
) => Promise<infer Value>
  ? Value
  : Func;

export type Maybe<T> = T | null | undefined;
