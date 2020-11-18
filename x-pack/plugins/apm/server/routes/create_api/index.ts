/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { merge as mergeLodash, pickBy, isEmpty, isPlainObject } from 'lodash';
import Boom from '@hapi/boom';
import { schema } from '@kbn/config-schema';
import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { isLeft } from 'fp-ts/lib/Either';
import { KibanaResponseFactory, RouteRegistrar } from 'src/core/server';
import { merge } from '../../../common/runtime_types/merge';
import { strictKeysRt } from '../../../common/runtime_types/strict_keys_rt';
import { APMConfig } from '../..';
import { ServerAPI } from '../typings';
import { jsonRt } from '../../../common/runtime_types/json_rt';

const debugRt = t.exact(
  t.partial({
    query: t.exact(t.partial({ _debug: jsonRt.pipe(t.boolean) })),
  })
);

type RouteOrRouteFactoryFn = Parameters<ServerAPI<{}>['add']>[0];

const isNotEmpty = (val: any) =>
  val !== undefined && val !== null && !(isPlainObject(val) && isEmpty(val));

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

        const {
          params,
          endpoint,
          options = { tags: ['access:apm'] },
          handler,
        } = route;

        const [method, path] = endpoint.split(' ');

        const typedRouterMethod = method.trim().toLowerCase() as
          | 'get'
          | 'post'
          | 'put'
          | 'delete';

        if (!['get', 'post', 'put', 'delete'].includes(typedRouterMethod)) {
          throw new Error(
            "Couldn't register route, as endpoint was not prefixed with a valid HTTP method"
          );
        }

        // For all runtime types with props, we create an exact
        // version that will strip all keys that are unvalidated.

        const paramsRt = params ? merge([params, debugRt]) : debugRt;

        const anyObject = schema.object({}, { unknowns: 'allow' });

        (router[typedRouterMethod] as RouteRegistrar<typeof typedRouterMethod>)(
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
            try {
              const paramMap = pickBy(
                {
                  path: request.params,
                  body: request.body,
                  query: {
                    _debug: 'false',
                    ...request.query,
                  },
                },
                isNotEmpty
              );

              const result = strictKeysRt(paramsRt).decode(paramMap);

              if (isLeft(result)) {
                throw Boom.badRequest(PathReporter.report(result)[0]);
              }
              const data = await handler({
                request,
                context: {
                  ...context,
                  plugins,
                  // Only return values for parameters that have runtime types,
                  // but always include query as _debug is always set even if
                  // it's not defined in the route.
                  params: mergeLodash(
                    { query: { _debug: false } },
                    pickBy(result.right, isNotEmpty)
                  ),
                  config,
                  logger,
                },
              });

              return response.ok({ body: data as any });
            } catch (error) {
              if (Boom.isBoom(error)) {
                return convertBoomToKibanaResponse(error, response);
              }
              throw error;
            }
          }
        );
      });
    },
  };

  return api;
}

function convertBoomToKibanaResponse(
  error: Boom,
  response: KibanaResponseFactory
) {
  const opts = { body: error.message };
  switch (error.output.statusCode) {
    case 404:
      return response.notFound(opts);

    case 400:
      return response.badRequest(opts);

    case 403:
      return response.forbidden(opts);

    default:
      return response.custom({
        statusCode: error.output.statusCode,
        ...opts,
      });
  }
}
