/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteInitializerDeps } from '../';
import { CANVAS_TYPE, API_ROUTE_WORKPAD, TEMPLATE_TYPE } from '../../../common/lib/constants';
import { CanvasWorkpad } from '../../../types';
import { getId } from '../../../common/lib/get_id';
import { WorkpadAttributes } from './workpad_attributes';
import { WorkpadSchema } from './workpad_schema';
import { okResponse } from '../ok_response';
import { catchErrorHandler } from '../catch_error_handler';

interface TemplateAttributes {
  template: CanvasWorkpad;
}

const WorkpadFromTemplateSchema = schema.object({
  templateId: schema.string(),
});

const createRequestBodySchema = schema.oneOf([WorkpadSchema, WorkpadFromTemplateSchema]);

function isCreateFromTemplate(
  maybeCreateFromTemplate: typeof createRequestBodySchema.type
): maybeCreateFromTemplate is typeof WorkpadFromTemplateSchema.type {
  return (
    (maybeCreateFromTemplate as typeof WorkpadFromTemplateSchema.type).templateId !== undefined
  );
}

export function initializeCreateWorkpadRoute(deps: RouteInitializerDeps) {
  const { router } = deps;
  router.post(
    {
      path: `${API_ROUTE_WORKPAD}`,
      validate: {
        body: createRequestBodySchema,
      },
      options: {
        body: {
          maxBytes: 26214400,
          accepts: ['application/json'],
        },
      },
    },
    catchErrorHandler(async (context, request, response) => {
      let workpad = request.body as CanvasWorkpad;

      if (isCreateFromTemplate(request.body)) {
        const templateSavedObject = await context.core.savedObjects.client.get<TemplateAttributes>(
          TEMPLATE_TYPE,
          request.body.templateId
        );
        workpad = templateSavedObject.attributes.template;
      }

      const now = new Date().toISOString();
      const { id: maybeId, ...payload } = workpad;

      const id = maybeId ? maybeId : getId('workpad');

      await context.core.savedObjects.client.create<WorkpadAttributes>(
        CANVAS_TYPE,
        {
          ...payload,
          '@timestamp': now,
          '@created': now,
        },
        { id }
      );

      return response.ok({
        body: { ...okResponse, id },
      });
    })
  );
}
