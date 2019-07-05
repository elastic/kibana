/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type f64 = number; // eventual AssemblyScript compatibility; doesn't hurt with vanilla TS either
type f = f64; // shorthand

export type vector2d = [f, f, f] & ReadonlyArray<f> & { __nominal: 'vector2d' };
export type vector3d = [f, f, f, f] & ReadonlyArray<f> & { __nominal: 'vector3d' };

export type transformMatrix2d = [f, f, f, f, f, f, f, f, f] &
  ReadonlyArray<f> & { __nominal: 'transformMatrix2d' };
export type transformMatrix3d = [f, f, f, f, f, f, f, f, f, f, f, f, f, f, f, f] &
  ReadonlyArray<f> & { __nominal: 'transformMatrix3d' };

export interface Meta {
  silent: boolean;
}
export type ActionId = number;
export type TypeName = string;
export type NodeResult = any;
export type Payload = any;
export type NodeFunction = (...args: any[]) => any;
export type UpdaterFunction = (arg: NodeResult) => NodeResult;
export type ChangeCallbackFunction = (
  { type, state }: { type: TypeName; state: NodeResult },
  meta: Meta
) => void;
