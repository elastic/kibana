/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IRouter,
  CustomRequestHandlerContext,
  CoreRequestHandlerContext,
} from '@kbn/core/server';
import type { AlertingApiRequestHandlerContext } from '@kbn/alerting-plugin/server';
import type { LicensingApiRequestHandlerContext } from '@kbn/licensing-plugin/server';

export type {
  ObservabilityRouteCreateOptions,
  ObservabilityRouteHandlerResources,
  AbstractObservabilityServerRouteRepository,
  ObservabilityServerRouteRepository,
  ObservabilityAPIReturnType,
} from './routes/types';

/**
 * @internal
 */
export type ObservabilityRequestHandlerContext = CustomRequestHandlerContext<{
  licensing: LicensingApiRequestHandlerContext;
  alerting: AlertingApiRequestHandlerContext;
  core: Promise<CoreRequestHandlerContext>;
}>;

/**
 * @internal
 */
export type ObservabilityPluginRouter = IRouter<ObservabilityRequestHandlerContext>;
