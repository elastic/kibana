/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AllowableSharedObservabilityMethods } from './typings';

const methodRegistry: Partial<
  Record<
    keyof AllowableSharedObservabilityMethods,
    AllowableSharedObservabilityMethods[keyof AllowableSharedObservabilityMethods]
  >
> = {};

export function registerSharedMethod({
  name,
  method,
}: {
  name: keyof AllowableSharedObservabilityMethods;
  method: AllowableSharedObservabilityMethods[typeof name];
}) {
  if (!method) {
    throw new Error('Attempted to register empty method');
  }
  methodRegistry[name] = method;
}

export function unregisterSharedMethod({
  name,
}: {
  name: keyof AllowableSharedObservabilityMethods;
}) {
  delete methodRegistry[name];
}

export function getSharedMethod<T extends keyof AllowableSharedObservabilityMethods>(name: T) {
  const sharedMethod = methodRegistry[name] as AllowableSharedObservabilityMethods[T];
  if (typeof sharedMethod === 'undefined') {
    throw new Error(`Method ${name} has not been registered`);
  }
  return sharedMethod!;
}
