/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import type {
  Logger,
  KibanaRequest,
  KibanaResponseFactory,
  RouteRegistrar,
  RouteSecurity,
} from '@kbn/core/server';
import { errors } from '@elastic/elasticsearch';
import agent from 'elastic-apm-node';
import type {
  DefaultRouteCreateOptions,
  IoTsParamsObject,
  ServerRouteRepository,
  ZodParamsObject,
} from '@kbn/server-route-repository';
import { stripNullishRequestParameters } from '@kbn/server-route-repository';
import { merge } from 'lodash';
import {
  decodeRequestParams,
  makeZodValidationObject,
  parseEndpoint,
  passThroughValidationObject,
} from '@kbn/server-route-repository';
import { jsonRt, mergeRt } from '@kbn/io-ts-utils';
import { isZod, z } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import type { InspectResponse } from '@kbn/observability-plugin/typings/common';
import apm from 'elastic-apm-node';
import type { VersionedRouteRegistrar } from '@kbn/core-http-server';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { addSpanLabels } from '@kbn/apm-utils';
import type { ApmFeatureFlags } from '../../../common/apm_feature_flags';
import type {
  APMCore,
  APMRouteCreateOptions,
  MinimalApmPluginRequestHandlerContext,
  TelemetryUsageCounter,
} from '../typings';
import type { ApmPluginRequestHandlerContext } from '../typings';
import type { APMConfig } from '../..';
import type { APMPluginSetupDependencies, APMPluginStartDependencies } from '../../types';

const inspectRt = t.exact(
  t.partial({
    query: t.exact(t.partial({ _inspect: jsonRt.pipe(t.boolean) })),
  })
);

// zod equivalent of `inspectRt`, merged into a zod route's `query` schema so
// the `?_inspect` debug query param is accepted by every zod-validated route,
// the same way it is for io-ts routes.
const inspectQueryShape = { _inspect: BooleanFromString.optional() };

function withInspectQueryParam(params: ZodParamsObject): ZodParamsObject {
  const query = params.shape.query;

  const queryWithInspect =
    query instanceof z.ZodObject
      ? query.extend(inspectQueryShape)
      : query
      ? z.intersection(query, z.object(inspectQueryShape))
      : z.object(inspectQueryShape);

  return params.extend({ query: queryWithInspect }) as ZodParamsObject;
}

const CLIENT_CLOSED_REQUEST = {
  statusCode: 499,
  body: {
    message: 'Client closed request',
  },
};

export const inspectableEsQueriesMap = new WeakMap<KibanaRequest, InspectResponse>();

export function registerRoutes({
  core,
  featureFlags,
  repository,
  plugins,
  logger,
  config,
  ruleDataClient,
  telemetryUsageCounter,
  kibanaVersion,
}: {
  core: APMRouteHandlerResources['core'];
  featureFlags: APMRouteHandlerResources['featureFlags'];
  plugins: APMRouteHandlerResources['plugins'];
  logger: APMRouteHandlerResources['logger'];
  repository: ServerRouteRepository;
  config: APMRouteHandlerResources['config'];
  ruleDataClient: APMRouteHandlerResources['ruleDataClient'];
  telemetryUsageCounter?: TelemetryUsageCounter;
  kibanaVersion: string;
}) {
  const routes = Object.values(repository);

  const router = core.setup.http.createRouter();

  routes.forEach((route) => {
    const { endpoint, handler, security } = route;

    const options = ('options' in route ? route.options : {}) as DefaultRouteCreateOptions &
      APMRouteCreateOptions;
    const params = 'params' in route ? route.params : undefined;
    const paramsIsZod = params !== undefined && isZod(params);

    const { method, pathname, version } = parseEndpoint(endpoint);

    // zod params are validated (and coerced) by Core using the schema passed
    // to `validate` below; io-ts params (and routes without params) are
    // validated later, inside the handler, via `decodeRequestParams`.
    const validate = paramsIsZod
      ? makeZodValidationObject(withInspectQueryParam(params as ZodParamsObject))
      : passThroughValidationObject;

    const wrappedHandler = async (
      context: ApmPluginRequestHandlerContext,
      request: KibanaRequest,
      response: KibanaResponseFactory
    ) => {
      if (agent.isStarted()) {
        addSpanLabels({
          plugin: 'apm',
        });
      }

      // init debug queries
      inspectableEsQueriesMap.set(request, []);

      try {
        const strippedParams = stripNullishRequestParameters({
          params: request.params,
          body: request.body,
          query: request.query,
        });

        // For zod routes, Core already validated (and coerced) the request
        // against `validate` above, so there's nothing left to decode here.
        const validatedParams = paramsIsZod
          ? strippedParams
          : decodeRequestParams(
              strippedParams,
              params ? mergeRt(params as IoTsParamsObject, inspectRt) : inspectRt
            );

        const getApmIndices = async () => {
          const coreContext = await context.core;
          const apmIndices = await plugins.apmDataAccess.setup.getApmIndices(
            coreContext.savedObjects.client
          );
          return apmIndices;
        };

        const { aborted, data } = await Promise.race([
          handler({
            request,
            context,
            config,
            featureFlags,
            logger,
            core,
            plugins,
            telemetryUsageCounter,
            getApmIndices,
            params: merge(
              {
                query: {
                  _inspect: false,
                },
              },
              validatedParams
            ),
            ruleDataClient,
            kibanaVersion,
          }).then((value: Record<string, any> | undefined | null) => {
            return {
              aborted: false,
              data: value,
            };
          }),
          request.events.aborted$.toPromise().then(() => {
            return {
              aborted: true,
              data: undefined,
            };
          }),
        ]);

        if (aborted) {
          return response.custom(CLIENT_CLOSED_REQUEST);
        }

        if (Array.isArray(data)) {
          throw new Error('Return type cannot be an array');
        }

        const body = validatedParams.query?._inspect
          ? {
              ...data,
              _inspect: inspectableEsQueriesMap.get(request),
            }
          : { ...data };
        if (!options.disableTelemetry && telemetryUsageCounter) {
          telemetryUsageCounter.incrementCounter({
            counterName: `${method.toUpperCase()} ${pathname}`,
            counterType: 'success',
          });
        }

        return response.ok({ body });
      } catch (error) {
        if (!options.disableTelemetry && telemetryUsageCounter) {
          telemetryUsageCounter.incrementCounter({
            counterName: `${method.toUpperCase()} ${pathname}`,
            counterType: 'error',
          });
        }
        const opts = {
          statusCode: 500,
          body: {
            message: error.message,
            attributes: {
              data: {},
              _inspect: inspectableEsQueriesMap.get(request),
            },
          },
        };

        if (error instanceof errors.RequestAbortedError) {
          return response.custom(merge(opts, CLIENT_CLOSED_REQUEST));
        }

        if (Boom.isBoom(error)) {
          opts.statusCode = error.output.statusCode;
          opts.body.attributes.data = error?.data;
        }

        if (opts.statusCode >= 500) {
          logger.error(error);
        }

        // capture error with APM node agent
        apm.captureError(error);

        return response.custom(opts);
      } finally {
        // cleanup
        inspectableEsQueriesMap.delete(request);
      }
    };

    if (!version) {
      (router[method] as RouteRegistrar<typeof method, ApmPluginRequestHandlerContext>)(
        {
          path: pathname,
          options,
          validate,
          security: security as RouteSecurity,
        },
        wrappedHandler
      );
    } else {
      (
        router.versioned[method] as VersionedRouteRegistrar<
          typeof method,
          ApmPluginRequestHandlerContext
        >
      )({
        path: pathname,
        access: pathname.includes('/internal/apm') ? 'internal' : 'public',
        options,
        security: security as RouteSecurity,
      }).addVersion(
        {
          version,
          validate: {
            request: validate,
          },
        },
        wrappedHandler
      );
    }
  });
}

type Plugins = {
  [key in keyof APMPluginSetupDependencies]: {
    setup: Required<APMPluginSetupDependencies>[key];
    start: () => Promise<Required<APMPluginStartDependencies>[key]>;
  };
};

export type MinimalAPMRouteHandlerResources = Omit<APMRouteHandlerResources, 'context'> & {
  context: MinimalApmPluginRequestHandlerContext;
};

export interface APMRouteHandlerResources {
  request: KibanaRequest;
  context: ApmPluginRequestHandlerContext;
  params: {
    query: {
      _inspect: boolean;
    };
  };
  config: APMConfig;
  featureFlags: ApmFeatureFlags;
  logger: Logger;
  core: APMCore;
  plugins: Plugins;
  ruleDataClient: IRuleDataClient;
  telemetryUsageCounter?: TelemetryUsageCounter;
  kibanaVersion: string;
  getApmIndices: () => Promise<APMIndices>;
}
