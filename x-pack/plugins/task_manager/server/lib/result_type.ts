/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { curry } from 'lodash';

export interface Ok<T> {
  tag: 'ok';
  value: T;
}

export interface Err<E> {
  tag: 'err';
  error: E;
}
export type Result<T, E> = Ok<T> | Err<E>;

export function asOk<T>(value: T): Ok<T> {
  return {
    tag: 'ok',
    value,
  };
}

export function asErr<T>(error: T): Err<T> {
  return {
    tag: 'err',
    error,
  };
}

export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.tag === 'ok';
}

export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !isOk(result);
}

export async function promiseResult<T, E>(future: Promise<T>): Promise<Result<T, E>> {
  try {
    return asOk(await future);
  } catch (e) {
    return asErr(e);
  }
}

export function unwrap<T, E>(result: Result<T, E>): T | E {
  return isOk(result) ? result.value : result.error;
}

export function either<T, E>(
  result: Result<T, E>,
  onOk: (value: T) => void,
  onErr: (error: E) => void
): Result<T, E> {
  map<T, E, void>(result, onOk, onErr);
  return result;
}

export async function eitherAsync<T, E>(
  result: Result<T, E>,
  onOk: (value: T) => Promise<void>,
  onErr: (error: E) => Promise<void>
): Promise<Result<T, E> | void> {
  return await map<T, E, Promise<void>>(result, onOk, onErr);
}

export function map<T, E, Resolution>(
  result: Result<T, E>,
  onOk: (value: T) => Resolution,
  onErr: (error: E) => Resolution
): Resolution {
  return isOk(result) ? onOk(result.value) : onErr(result.error);
}

export const mapR = curry(function<T, E, Resolution>(
  onOk: (value: T) => Resolution,
  onErr: (error: E) => Resolution,
  result: Result<T, E>
): Resolution {
  return map(result, onOk, onErr);
});

export const mapOk = curry(function<T, T2, E>(
  onOk: (value: T) => Result<T2, E>,
  result: Result<T, E>
): Result<T2, E> {
  return isOk(result) ? onOk(result.value) : result;
});

export const mapErr = curry(function<T, E, E2>(
  onErr: (error: E) => Result<T, E2>,
  result: Result<T, E>
): Result<T, E2> {
  return isOk(result) ? result : onErr(result.error);
});
