/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

// linear algebra
type f64 = number; // eventual AssemblyScript compatibility; doesn't hurt with vanilla TS either
type f = f64; // shorthand

export type vector2d = [f, f, f] & ReadonlyArray<f> & { __nominal: 'vector2d' };
export type vector3d = [f, f, f, f] & ReadonlyArray<f> & { __nominal: 'vector3d' };

export type transformMatrix2d = [f, f, f, f, f, f, f, f, f] &
  ReadonlyArray<f> & { __nominal: 'transformMatrix2d' };
export type transformMatrix3d = [f, f, f, f, f, f, f, f, f, f, f, f, f, f, f, f] &
  ReadonlyArray<f> & { __nominal: 'transformMatrix3d' };

// plain, JSON-bijective value
export type Json = JsonPrimitive | JsonArray | JsonMap;
type JsonPrimitive = null | boolean | number | string;
interface JsonArray extends Array<Json> {}
interface JsonMap extends IMap<Json> {}
interface IMap<T> {
  [key: string]: T;
}

// state object
export type State = JsonMap & WithActionId;
export type ActionId = number;
interface WithActionId {
  primaryUpdate: { type: string; payload: { uid: ActionId; [propName: string]: Json } };
  [propName: string]: Json; // allow other arbitrary props
}

// reselect-based data flow
export type PlainFun = (...args: Json[]) => Json;
export type Selector = (...fns: Resolve[]) => Resolve;
type Resolve = ((obj: State) => Json);

export type TypeName = string;
export type Payload = JsonMap;
export type UpdaterFunction = (arg: State) => State;
