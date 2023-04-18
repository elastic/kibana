/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type {
  EndpointOf,
  ReturnOf,
  ServerRouteRepository,
} from '@kbn/server-route-repository';
import { PickByValue } from 'utility-types';
import { helloWorldRouteRepository } from './hello_world/route';

function getTypedObservabilityOnboardingServerRouteRepository() {
  const repository = {
    ...helloWorldRouteRepository,
  };

  return repository;
}

export const getObservabilityOnboardingServerRouteRepository =
  (): ServerRouteRepository => {
    return getTypedObservabilityOnboardingServerRouteRepository();
  };

export type ObservabilityOnboardingServerRouteRepository = ReturnType<
  typeof getTypedObservabilityOnboardingServerRouteRepository
>;

// Ensure no APIs return arrays (or, by proxy, the any type),
// to guarantee compatibility with _inspect.

export type APIEndpoint =
  EndpointOf<ObservabilityOnboardingServerRouteRepository>;

type EndpointReturnTypes = {
  [Endpoint in APIEndpoint]: ReturnOf<
    ObservabilityOnboardingServerRouteRepository,
    Endpoint
  >;
};

type ArrayLikeReturnTypes = PickByValue<EndpointReturnTypes, any[]>;

type ViolatingEndpoints = keyof ArrayLikeReturnTypes;

function assertType<T = never, U extends T = never>() {}

// if any endpoint has an array-like return type, the assertion below will fail
assertType<never, ViolatingEndpoints>();
