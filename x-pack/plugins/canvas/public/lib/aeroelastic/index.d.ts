/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @typescript-eslint/no-empty-interface */

// linear algebra
type f64 = number; // eventual AssemblyScript compatibility; doesn't hurt with vanilla TS either
type f = f64; // shorthand

export type Vector2d = Readonly<[f, f, f]>;
export type Vector3d = Readonly<[f, f, f, f]>;

export type Matrix2d = [f, f, f, f, f, f, f, f, f];
export type TransformMatrix2d = Readonly<Matrix2d>;
export type Matrix3d = [f, f, f, f, f, f, f, f, f, f, f, f, f, f, f, f];
export type TransformMatrix3d = Readonly<Matrix3d>;

// plain, JSON-bijective value
export type Json = JsonPrimitive | JsonArray | JsonMap;
type JsonPrimitive = null | boolean | number | string;
interface JsonArray extends Array<Json> {}
interface JsonMap {
  [key: string]: Json;
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
export type Resolve = ((obj: State) => Json);

export type TypeName = string;
export type Payload = JsonMap;
export type UpdaterFunction = (arg: State) => State;

export interface Store {
  getCurrentState: () => State;
  setCurrentState: (state: State) => void;
  commit: (type: TypeName, payload: Payload) => void;
}
