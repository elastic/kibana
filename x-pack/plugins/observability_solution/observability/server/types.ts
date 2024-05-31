/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as rt from 'io-ts';
import { isoToEpochRt, nonEmptyStringRt } from '@kbn/io-ts-utils';
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
  APIEndpoint,
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

export const metricsExplorerViewSavedObjectAttributesRT = rt.intersection([
  rt.strict({
    name: nonEmptyStringRt,
  }),
  rt.UnknownRecord,
]);

export const metricsExplorerViewSavedObjectRT = rt.intersection([
  rt.type({
    id: rt.string,
    attributes: metricsExplorerViewSavedObjectAttributesRT,
  }),
  rt.partial({
    version: rt.string,
    updated_at: isoToEpochRt,
  }),
]);
