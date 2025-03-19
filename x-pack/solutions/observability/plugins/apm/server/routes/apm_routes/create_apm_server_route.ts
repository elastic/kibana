/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createServerRouteFactory } from '@kbn/server-route-repository';
import type { APMRouteCreateOptions } from '../typings';
import type { APMRouteHandlerResources } from './register_apm_server_routes';

export const createApmServerRoute = createServerRouteFactory<
  APMRouteHandlerResources,
  APMRouteCreateOptions
>();
