/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, RequestHandler, RouteConfig, LoggerFactory } from 'kibana/server';

import { schema } from '@kbn/config-schema';

import { BootstrapService } from '../services/bootstrap';
import { wrapError } from '../services/bootstrap/errors';

export function addRoutes(router: IRouter, factory: LoggerFactory) {
  router.post(
    {
      path: '/endpoint/bootstrap',
      validate: bootstrapRequestSchema,
    },
    getBootstrapHandler(factory)
  );
}

export const bootstrapRequestSchema = {
  query: schema.object({
    'index-pattern': schema.string(),
  }),
};

type BootstrapperRequestHandler = { validate: typeof bootstrapRequestSchema } extends Pick<
  RouteConfig<infer P, infer Q, infer B>,
  'validate'
>
  ? RequestHandler<P, Q, B>
  : never;

export const getBootstrapHandler = (factory: LoggerFactory): BootstrapperRequestHandler => {
  return async function(context, request, response) {
    const indexPattern = request.query['index-pattern'];

    const log = factory.get('bootstrap-route');
    log.info(`trying to bootstrap ${indexPattern}`);
    const boot: BootstrapService = new BootstrapService(
      context.core.elasticsearch.dataClient,
      factory
    );
    try {
      await boot.doBootstrapping();
    } catch (e) {
      const wrappedError = wrapError(e);
      return response.customError({
        body: wrappedError,
        statusCode: wrappedError.output.statusCode,
      });
    }

    const data = {
      hello: 'blah',
    };

    return response.ok({
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };
};
