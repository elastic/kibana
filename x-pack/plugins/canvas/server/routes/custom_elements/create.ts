/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteInitializerDeps } from '../';
import { CUSTOM_ELEMENT_TYPE, API_ROUTE_CUSTOM_ELEMENT } from '../../../common/lib/constants';
import { getId } from '../../../common/lib/get_id';
import { CustomElementSchema } from './custom_element_schema';
import { CustomElementAttributes } from './custom_element_attributes';
import { okResponse } from '../ok_response';
import { catchErrorHandler } from '../catch_error_handler';

export function initializeCreateCustomElementRoute(deps: RouteInitializerDeps) {
  const { router } = deps;
  router.post(
    {
      path: `${API_ROUTE_CUSTOM_ELEMENT}`,
      validate: {
        body: CustomElementSchema,
      },
      options: {
        body: {
          maxBytes: 26214400, // 25MB payload limit
          accepts: ['application/json'],
        },
      },
    },
    catchErrorHandler(async (context, request, response) => {
      const customElement = request.body;

      const now = new Date().toISOString();
      const { id, ...payload } = customElement;

      const soClient = (await context.core).savedObjects.client;
      await soClient.create<CustomElementAttributes>(
        CUSTOM_ELEMENT_TYPE,
        {
          ...payload,
          '@timestamp': now,
          '@created': now,
        },
        { id: id || getId('custom-element') }
      );

      return response.ok({
        body: okResponse,
      });
    })
  );
}
