/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteInitializerDeps } from '../';
import {
  CANVAS_TYPE,
  API_ROUTE_WORKPAD,
} from '../../../../../legacy/plugins/canvas/common/lib/constants';
import { WorkpadAttributes } from './workpad_attributes';
import { catchErrorHandler } from '../catch_error_handler';

export function initializeGetWorkpadRoute(deps: RouteInitializerDeps) {
  const { router } = deps;
  router.get(
    {
      path: `${API_ROUTE_WORKPAD}/{id}`,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    catchErrorHandler(async (context, request, response) => {
      const workpad = await context.core.savedObjects.client.get<WorkpadAttributes>(
        CANVAS_TYPE,
        request.params.id
      );

      if (
        // not sure if we need to be this defensive
        workpad.type === 'canvas-workpad' &&
        workpad.attributes &&
        workpad.attributes.pages &&
        workpad.attributes.pages.length
      ) {
        workpad.attributes.pages.forEach(page => {
          const elements = (page.elements || []).filter(
            ({ id: pageId }) => !pageId.startsWith('group')
          );
          const groups = (page.groups || []).concat(
            (page.elements || []).filter(({ id: pageId }) => pageId.startsWith('group'))
          );
          page.elements = elements;
          page.groups = groups;
        });
      }

      return response.ok({
        body: {
          id: workpad.id,
          ...workpad.attributes,
        },
      });
    })
  );
}
