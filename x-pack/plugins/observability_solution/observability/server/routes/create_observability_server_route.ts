/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createServerRouteFactory } from '@kbn/server-route-repository';
import { ObservabilityRouteCreateOptions, ObservabilityRouteHandlerResources } from './types';

export const createObservabilityServerRoute = createServerRouteFactory<
  ObservabilityRouteHandlerResources,
  ObservabilityRouteCreateOptions
>();
