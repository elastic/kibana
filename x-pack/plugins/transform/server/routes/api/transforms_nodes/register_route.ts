/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addInternalBasePath } from '../../../../common/constants';

import type { RouteDependencies } from '../../../types';

import { routeHandlerFactory } from './route_handler_factory';

export function registerRoute({ router, license }: RouteDependencies) {
  /**
   * @apiGroup Transform Nodes
   *
   * @api {get} /internal/transforms/_nodes Transform Nodes
   * @apiName GetTransformNodes
   * @apiDescription Get transform nodes
   */
  router.versioned
    .get({
      path: addInternalBasePath('transforms/_nodes'),
      access: 'internal',
    })
    .addVersion<undefined, undefined, undefined>(
      {
        version: '1',
        validate: false,
      },
      license.guardApiRoute<undefined, undefined, undefined>(routeHandlerFactory(license))
    );
}
