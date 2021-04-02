/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge as mergeLodash, pickBy, isEmpty, isPlainObject } from 'lodash';
import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isLeft } from 'fp-ts/lib/Either';
import { KibanaRequest, RouteRegistrar } from 'src/core/server';
import { RequestAbortedError } from '@elastic/elasticsearch/lib/errors';
import agent from 'elastic-apm-node';
import { parseMethod } from '../../../common/apm_api/parse_endpoint';
import { merge } from '../../../common/runtime_types/merge';
import { strictKeysRt } from '../../../common/runtime_types/strict_keys_rt';
import { APMConfig } from '../..';
import { InspectResponse, RouteParamsRT, ServerAPI } from '../typings';
import { jsonRt } from '../../../common/runtime_types/json_rt';
import type { ApmPluginRequestHandlerContext } from '../typings';

const inspectRt = t.exact(
  t.partial({
    query: t.exact(t.partial({ _inspect: jsonRt.pipe(t.boolean) })),
  })
);

type RouteOrRouteFactoryFn = Parameters<ServerAPI<{}>['add']>[0];

const isNotEmpty = (val: any) =>
  val !== undefined && val !== null && !(isPlainObject(val) && isEmpty(val));

export const inspectableEsQueriesMap = new WeakMap<
  KibanaRequest,
  InspectResponse
>();

export function createApi() {
  const routes: RouteOrRouteFactoryFn[] = [];
  const api: ServerAPI<{}> = {
    _S: {},
    add(route) {
      routes.push((route as unknown) as RouteOrRouteFactoryFn);
      return this as any;
    },
    init(core, { config$, logger, plugins }) {
      const router = core.http.createRouter();

      let config = {} as APMConfig;

      config$.subscribe((val) => {
        config = val;
      });

      routes.forEach((routeOrFactoryFn) => {
        const route =
          typeof routeOrFactoryFn === 'function'
            ? routeOrFactoryFn(core)
            : routeOrFactoryFn;

        const { params, endpoint, options, handler } = route;

        const [method, path] = endpoint.split(' ');
        const typedRouterMethod = parseMethod(method);

        // For all runtime types with props, we create an exact
        // version that will strip all keys that are unvalidated.
        const anyObject = schema.object({}, { unknowns: 'allow' });

        (router[typedRouterMethod] as RouteRegistrar<
          typeof typedRouterMethod,
          ApmPluginRequestHandlerContext
        >)(
          {
            path,
            options,
            validate: {
              // `body` can be null, but `validate` expects non-nullable types
              // if any validation is defined. Not having validation currently
              // means we don't get the payload. See
              // https://github.com/elastic/kibana/issues/50179
              body: schema.nullable(anyObject),
              params: anyObject,
              query: anyObject,
            },
          },
          async (context, request, response) => {
            if (agent.isStarted()) {
              agent.addLabels({
                plugin: 'apm',
              });
            }

            // init debug queries
            inspectableEsQueriesMap.set(request, []);

            try {
              const validParams = validateParams(request, params);
              const data = await handler({
                request,
                context: {
                  ...context,
                  plugins,
                  params: validParams,
                  config,
                  logger,
                },
              });

              const body = { ...data };
              if (validParams.query._inspect) {
                body._inspect = inspectableEsQueriesMap.get(request);
              }

              // cleanup
              inspectableEsQueriesMap.delete(request);

              return response.ok({ body });
            } catch (error) {
              const opts = {
                statusCode: 500,
                body: {
                  message: error.message,
                  attributes: {
                    _inspect: inspectableEsQueriesMap.get(request),
                  },
                },
              };

              if (Boom.isBoom(error)) {
                opts.statusCode = error.output.statusCode;
              }

              if (error instanceof RequestAbortedError) {
                opts.statusCode = 499;
                opts.body.message = 'Client closed request';
              }

              return response.custom(opts);
            }
          }
        );
      });
    },
  };

  return api;
}

function validateParams(
  request: KibanaRequest,
  params: RouteParamsRT | undefined
) {
  const paramsRt = params ? merge([params, inspectRt]) : inspectRt;
  const paramMap = pickBy(
    {
      path: request.params,
      body: request.body,
      query: {
        _inspect: 'false',
        // @ts-ignore
        ...request.query,
      },
    },
    isNotEmpty
  );

  const result = strictKeysRt(paramsRt).decode(paramMap);

  if (isLeft(result)) {
    throw Boom.badRequest(PathReporter.report(result)[0]);
  }

  // Only return values for parameters that have runtime types,
  // but always include query as _inspect is always set even if
  // it's not defined in the route.
  return mergeLodash(
    { query: { _inspect: false } },
    pickBy(result.right, isNotEmpty)
  );
}
