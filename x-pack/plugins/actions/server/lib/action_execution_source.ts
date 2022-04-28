/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaRequest, SavedObjectReference } from '@kbn/core/server';

export enum ActionExecutionSourceType {
  SAVED_OBJECT = 'SAVED_OBJECT',
  HTTP_REQUEST = 'HTTP_REQUEST',
}

export interface ActionExecutionSource<T> {
  type: ActionExecutionSourceType;
  source: T;
}
export type HttpRequestExecutionSource = ActionExecutionSource<KibanaRequest>;
export type SavedObjectExecutionSource = ActionExecutionSource<Omit<SavedObjectReference, 'name'>>;

export function asHttpRequestExecutionSource(source: KibanaRequest): HttpRequestExecutionSource {
  return {
    type: ActionExecutionSourceType.HTTP_REQUEST,
    source,
  };
}

export function asSavedObjectExecutionSource(
  source: Omit<SavedObjectReference, 'name'>
): SavedObjectExecutionSource {
  return {
    type: ActionExecutionSourceType.SAVED_OBJECT,
    source,
  };
}

export function isHttpRequestExecutionSource(
  executionSource?: ActionExecutionSource<unknown>
): executionSource is HttpRequestExecutionSource {
  return executionSource?.type === ActionExecutionSourceType.HTTP_REQUEST;
}

export function isSavedObjectExecutionSource(
  executionSource?: ActionExecutionSource<unknown>
): executionSource is SavedObjectExecutionSource {
  return executionSource?.type === ActionExecutionSourceType.SAVED_OBJECT;
}
