/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter, RequestHandler, RouteConfig } from 'kibana/server';

import { BootstrapService } from '../services/bootstrap';
import { wrapError } from '../services/bootstrap/errors';
import { EndpointAppContext } from '../types';

export function registerBootstrapRoutes(router: IRouter, context: EndpointAppContext) {
  router.post(
    {
      path: '/endpoint/bootstrap',
      validate: false,
    },
    getBootstrapHandler(context)
  );
}

type BootstrapperRequestHandler = { validate: false } extends Pick<
  RouteConfig<infer P, infer Q, infer B>,
  'validate'
>
  ? RequestHandler<P, Q, B>
  : never;

export const getBootstrapHandler = (appContext: EndpointAppContext): BootstrapperRequestHandler => {
  return async function(context, request, response) {
    const log = appContext.logFactory.get('bootstrap-route');
    log.debug(`trying to bootstrap`);
    const boot: BootstrapService = new BootstrapService(
      context.core.elasticsearch.dataClient,
      appContext
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

    return response.ok({
      body: {},
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };
};
